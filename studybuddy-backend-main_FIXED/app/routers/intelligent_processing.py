# app/routers/intelligent_processing.py
"""
Intelligent Document Processing API

Goal:
- Works with your CURRENT schema (documents.user_id, documents.pdf_path, etc.)
- Adds "intelligence" without breaking existing upload/library endpoints
- Supports ALL subjects by routing through the classifier + subject-aware extractors
- Returns immediately after storage upload; heavy AI work runs in the background.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Any, Dict, Optional
import json
import asyncio
from uuid import UUID

from loguru import logger

from ..auth import user_id_from_auth_header
from ..services.pdf import extract_text_from_pdf
from ..services.intelligent_classifier import classify_and_recommend
from ..services.knowledge_graph import extract_knowledge_graph
from ..services.auto_study_materials import generate_all_materials
from ..services.syllabus_processor import process_syllabus, get_this_weeks_tasks, generate_exam_prep_plan
from ..services.concept_engine import update_class_graph
from ..services.cache import sha256_bytes
from ..services.db import new_uuid, upload_pdf_to_storage, upsert_document
from ..services.job_store import create_job, update_job, get_job
from ..services.summary import make_markdown_summary
from ..supabase import supabase


router = APIRouter(prefix="/intelligent", tags=["intelligent"])

# Keep strong references to running background tasks to prevent GC cancellation.
_background_tasks: set[asyncio.Task] = set()


# -----------------------------
# helpers
# -----------------------------

def _as_uuid(s: str) -> str:
    try:
        UUID(str(s))
        return str(s)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _to_concept_prompt_shape(unified_concepts: list[dict[str, Any]]) -> dict[str, Any]:
    """Make concepts compatible with your existing guide_json rendering."""
    out = []
    for c in unified_concepts:
        out.append({
            "name": c.get("name", "")[:200],
            "importance": c.get("importance", "important"),
            "difficulty": c.get("difficulty", "medium"),
            "simple": c.get("simple") or c.get("definition") or "",
            "detailed": c.get("detailed") or c.get("definition") or "",
            "technical": c.get("technical") or "",
            "example": c.get("example") or "",
            "common_mistake": c.get("common_mistake") or "",
        })
    return {"concepts": out}


# -----------------------------
# background processing task
# -----------------------------

async def _background_process_document(
    *,
    doc_id: str,
    class_id: str,
    user_id: str,
    text_content: str,
    filename: str,
    pdf_path: str,
    content_hash: str,
) -> None:
    """
    Full AI pipeline executed in the background after the HTTP response is sent.
    Uses the high-quality chunked summary (make_markdown_summary from services.summary).
    """
    try:
        update_job(doc_id, status="processing", stage="classifying")

        # 1) Classify
        classification = await classify_and_recommend(text_content)
        cls = classification.get("classification", {}) if isinstance(classification, dict) else {}
        doc_type = (cls.get("document_type") or "document").lower()
        subject_area = (cls.get("subject_area") or "other").lower()

        # 2) Syllabus path
        if doc_type == "syllabus":
            update_job(doc_id, stage="generating_summary")
            syllabus_data = await process_syllabus(text_content)
            summary_md = await make_markdown_summary(text_content, word_target=1200)

            upsert_document(
                user_id=user_id,
                doc_id=doc_id,
                class_id=class_id,
                title=filename or "Syllabus",
                summary=summary_md,
                cards_json=json.dumps({"cards": []}),
                guide_json=json.dumps({"concepts": []}),
                pdf_path=pdf_path,
                content_hash=content_hash,
            )

            try:
                supabase.table("syllabus_data").upsert({
                    "class_id": class_id,
                    "document_id": doc_id,
                    "course_info": syllabus_data.get("course_info", {}),
                    "schedule": syllabus_data.get("schedule", []),
                    "assessments": syllabus_data.get("assessments", []),
                    "grading": syllabus_data.get("grading_breakdown", {}),
                    "study_timeline": syllabus_data.get("study_timeline", []),
                }, on_conflict="document_id").execute()
            except Exception as e:
                logger.warning(f"[syllabus_data] insert failed: {e}")

            try:
                supabase.table("classes").update({
                    "subject_area": subject_area,
                    "has_syllabus": True,
                }).eq("id", class_id).eq("user_id", user_id).execute()
            except Exception as e:
                logger.warning(f"[classes] could not update: {e}")

            try:
                supabase.table("document_intelligence").upsert({
                    "document_id": doc_id,
                    "class_id": class_id,
                    "user_id": user_id,
                    "document_type": doc_type,
                    "subject_area": subject_area,
                    "classification": classification,
                }, on_conflict="document_id").execute()
            except Exception as e:
                logger.warning(f"[document_intelligence] insert failed: {e}")

            update_job(doc_id, status="completed", stage="completed",
                       document_type="syllabus",
                       syllabus_summary={
                           "weeks": len(syllabus_data.get("schedule", [])),
                           "assessments": len(syllabus_data.get("assessments", [])),
                           "course_name": (syllabus_data.get("course_info", {}) or {}).get("name"),
                       })
            return

        # 3) Knowledge graph extraction
        update_job(doc_id, stage="extracting_concepts")
        graph = await extract_knowledge_graph(text_content, max_nodes=12)
        concepts = graph.get("concepts", []) if isinstance(graph, dict) else []

        concepts_for_materials: list[dict[str, Any]] = []
        if isinstance(concepts, list):
            for c in concepts:
                concepts_for_materials.append({
                    "name": c.get("name"),
                    "definition": c.get("detailed") or c.get("simple") or "",
                    "example": c.get("example") or "",
                })

        mode = (graph.get("meta", {}) or {}).get("extraction_mode") if isinstance(graph, dict) else None
        subject_for_materials = mode if mode in {"stem", "humanities", "social_science"} else subject_area

        # 4) Summary + materials in parallel (high-quality chunked summary preserved)
        update_job(doc_id, stage="generating_summary")
        materials_task = generate_all_materials(concepts_for_materials, subject_for_materials)
        summary_task = make_markdown_summary(text_content, word_target=1600)
        materials, summary_md = await asyncio.gather(materials_task, summary_task)

        update_job(doc_id, stage="building_materials")
        flashcards = materials.get("flashcards", []) if isinstance(materials, dict) else []
        cards_json = json.dumps({"cards": flashcards}, ensure_ascii=False)
        guide_json = json.dumps(graph, ensure_ascii=False)

        # 5) Persist final document
        update_job(doc_id, stage="finalizing")
        upsert_document(
            user_id=user_id,
            doc_id=doc_id,
            class_id=class_id,
            title=filename or "Document",
            summary=summary_md or "",
            cards_json=cards_json,
            guide_json=guide_json,
            pdf_path=pdf_path,
            content_hash=content_hash,
        )

        # 6) Update concept graph
        try:
            await update_class_graph(class_id=class_id, doc_id=doc_id, guide_json=guide_json)
        except Exception as e:
            logger.warning(f"[graph] update_class_graph failed: {e}")

        # 7) Save classification metadata
        try:
            supabase.table("document_intelligence").upsert({
                "document_id": doc_id,
                "class_id": class_id,
                "user_id": user_id,
                "document_type": doc_type,
                "subject_area": subject_area,
                "classification": classification,
            }, on_conflict="document_id").execute()
        except Exception as e:
            logger.warning(f"[document_intelligence] insert failed: {e}")

        update_job(doc_id, status="completed", stage="completed",
                   document_type=doc_type, subject_area=subject_area,
                   stats={
                       "concepts_extracted": len(concepts) if isinstance(concepts, list) else 0,
                       "flashcards_created": len(flashcards),
                       "materials_generated": True,
                   })

    except Exception as exc:
        logger.error(f"[background] processing failed for {doc_id}: {exc}")
        update_job(doc_id, status="failed", stage="failed", error=str(exc))


# -----------------------------
# main: intelligent upload
# -----------------------------

@router.post("/process-document/{class_id}")
async def process_document_intelligent(
    class_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(user_id_from_auth_header),
):
    """
    Upload ANY document and get subject-aware study materials.

    Returns immediately after file upload + placeholder creation.
    All AI processing (classification, summary, flashcards, graph) runs in the
    background. Poll GET /intelligent/status/{document_id} for progress.
    """

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _as_uuid(class_id)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    # Upload PDF to storage + create placeholder doc immediately
    doc_id = new_uuid()
    content_hash = sha256_bytes(raw)
    filename = file.filename or "document.pdf"

    pdf_path = upload_pdf_to_storage(
        user_id=user_id,
        doc_id=doc_id,
        raw_pdf=raw,
        filename=filename,
    )

    # Create placeholder document row so downstream routes work right away
    upsert_document(
        user_id=user_id,
        doc_id=doc_id,
        class_id=class_id,
        title=filename,
        summary="",
        cards_json=json.dumps({"cards": []}),
        guide_json=json.dumps({"concepts": []}),
        pdf_path=pdf_path,
        content_hash=content_hash,
    )

    # Register job so the status endpoint can report progress
    create_job(doc_id)

    # Extract text synchronously (fast – no AI, just PyMuPDF)
    text_content = extract_text_from_pdf(raw) or ""
    if len(text_content.strip()) < 100:
        update_job(doc_id, status="failed", stage="failed",
                   error="Could not extract text from document")
        raise HTTPException(status_code=400, detail="Could not extract text from document")

    # Fire background AI processing – response is sent immediately
    task = asyncio.create_task(
        _background_process_document(
            doc_id=doc_id,
            class_id=class_id,
            user_id=user_id,
            text_content=text_content,
            filename=filename,
            pdf_path=pdf_path,
            content_hash=content_hash,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return {
        "document_id": doc_id,
        "status": "queued",
        "status_url": f"/intelligent/status/{doc_id}",
    }


# -----------------------------
# status polling endpoint
# -----------------------------

@router.get("/status/{doc_id}")
async def get_processing_status(
    doc_id: str,
    user_id: str = Depends(user_id_from_auth_header),
):
    """
    Poll the processing status of a document after upload.

    Returns one of:
      status: queued | processing | completed | failed
      stage:  queued | classifying | extracting_concepts | generating_summary |
              building_materials | finalizing | completed | failed
      error:  null or error message
      document_id: the document id
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    job = get_job(doc_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


# -----------------------------
# dashboard helpers (work only if syllabus_data table exists)
# -----------------------------

@router.get("/dashboard/{class_id}/today")
async def get_todays_plan(class_id: str, user_id: str = Depends(user_id_from_auth_header)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _as_uuid(class_id)

    # Get class metadata
    class_result = supabase.table("classes").select("*").eq("id", class_id).eq("user_id", user_id).execute()
    if not class_result.data:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get syllabus data (optional)
    try:
        syllabus_result = supabase.table("syllabus_data").select("*").eq("class_id", class_id).execute()
    except Exception:
        syllabus_result = None

    if not syllabus_result or not syllabus_result.data:
        return {
            "message": "Upload your syllabus to get personalized daily plans!",
            "tasks": [],
            "recommendation": "Start by uploading your course syllabus",
        }

    syllabus_row = syllabus_result.data[0]
    schedule = syllabus_row.get("schedule") or []
    study_timeline = syllabus_row.get("study_timeline") or []

    current_week = 1 if schedule else 0

    week_tasks = await get_this_weeks_tasks(
        {
            "study_timeline": study_timeline,
            "assessments": syllabus_row.get("assessments") or [],
        },
        current_week,
    )

    # Student progress (optional table)
    try:
        progress_result = supabase.table("student_progress").select("*").eq("student_id", user_id).eq("class_id", class_id).execute()
        concepts_mastered = len([p for p in (progress_result.data or []) if p.get("mastery_level") == "mastered"])
    except Exception:
        concepts_mastered = 0

    return {
        "class_name": class_result.data[0].get("name"),
        "current_week": current_week,
        "week_title": week_tasks.get("title", f"Week {current_week}"),
        "today_focus": (week_tasks.get("tasks") or [])[:3],
        "estimated_time": week_tasks.get("estimated_hours", 5),
        "why_important": week_tasks.get("why_important", ""),
        "upcoming_assessments": week_tasks.get("upcoming_assessments", []),
        "your_progress": {
            "concepts_mastered": concepts_mastered,
            "this_week_topics": week_tasks.get("topics", []),
        },
        "study_methods": week_tasks.get("study_methods", ["flashcards", "concept_map"]),
        "materials_available": {
            "flashcards": True,
            "quizzes": True,
            "concept_map": True,
            "study_guide": True,
        },
    }


@router.post("/exam-prep/{class_id}")
async def create_exam_prep_plan(class_id: str, exam_name: str, weeks_until: int = 4, user_id: str = Depends(user_id_from_auth_header)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _as_uuid(class_id)

    try:
        syllabus_result = supabase.table("syllabus_data").select("*").eq("class_id", class_id).execute()
    except Exception:
        syllabus_result = None

    if not syllabus_result or not syllabus_result.data:
        raise HTTPException(status_code=404, detail="Syllabus not found. Upload syllabus first.")

    syllabus_data = {
        "assessments": syllabus_result.data[0].get("assessments") or [],
        "schedule": syllabus_result.data[0].get("schedule") or [],
    }

    prep_plan = await generate_exam_prep_plan(syllabus_data, exam_name, weeks_until)

    return {
        "exam_name": exam_name,
        "weeks_until": weeks_until,
        "prep_plan": prep_plan.get("prep_plan", []),
        "strategies": prep_plan.get("study_strategies", []),
        "common_pitfalls": prep_plan.get("common_pitfalls", []),
        "day_before_tips": prep_plan.get("day_before_tips", []),
    }
