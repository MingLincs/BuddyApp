# app/routers/intelligent_processing.py
"""
Intelligent Document Processing API

Goal:
- Works with your CURRENT schema (documents.user_id, documents.pdf_path, etc.)
- Adds "intelligence" without breaking existing upload/library endpoints
- Supports ALL subjects by routing through the classifier + subject-aware extractors
- Fast-accept: upload returns quickly; heavy AI work runs in background
"""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from typing import Any, Optional
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
from ..services.llm import llm
from ..services.db import new_uuid, upload_pdf_to_storage, upsert_document, find_document_id_by_hash
from ..supabase import supabase


router = APIRouter(prefix="/intelligent", tags=["intelligent"])


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


async def _make_markdown_summary(text_content: str, word_target: int = 1600) -> str:
    """
    Same style as before, but:
    - does NOT truncate input to 18k chars
    - chunks full doc -> summarizes chunks -> merges
    - forces LaTeX for equations
    """
    import re
    import asyncio

    src_full = (text_content or "").strip()
    if not src_full:
        return ""

    # Keep your original "study notes" style prompt, just add LaTeX rules
    system_prompt = (
        f"Write detailed structured study notes in markdown (~{word_target} words). "
        "Use headings and subheadings, bullets, and clear spacing. "
        "Make it readable for studying.\n\n"
        "FORMATTING RULES (must follow):\n"
        "- If you write ANY equation/math, ALWAYS write it in LaTeX.\n"
        "- Inline math: $f(x)=x^2$.\n"
        "- Display math for multi-step:\n"
        "  $$\n"
        "  f(2)=2^2+3\\cdot2-4=6\n"
        "  $$\n"
        "- Use \\cdot, \\frac, \\sqrt, \\mathbb{R}, \\neq, \\ge, \\le.\n"
        "- Do NOT end mid-sentence.\n"
    )

    # Clean common PDF UI junk that pollutes notes
    def _clean_pdf_noise(s: str) -> str:
        s = s.replace("\x00", " ")
        s = re.sub(r"(?im)^\s*(summary|export\s*pdf|download)\s*$", "", s)
        s = re.sub(r"(?im)^\s*\d+\s*\$\s*\.?\s*$", "", s)
        s = re.sub(r"[ \t]+", " ", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        return s.strip()

    src_full = _clean_pdf_noise(src_full)

    # Allow much more text than 18k (adjust up if you want)
    src_full = src_full[:90000]

    # Chunking
    chunk_size = 14000
    overlap = 900
    chunks = []
    i = 0
    while i < len(src_full):
        j = min(len(src_full), i + chunk_size)
        chunks.append(src_full[i:j])
        if j == len(src_full):
            break
        i = max(0, j - overlap)

    # Summarize each chunk with enough room to be detailed
    per_chunk_words = max(650, int(word_target / max(1, min(len(chunks), 3))))

    async def summarize_chunk(chunk: str) -> str:
        return await llm(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"{chunk}\n\n"
                        "INSTRUCTIONS:\n"
                        f"- Write dense, complete study notes (~{per_chunk_words}–{per_chunk_words+300} words).\n"
                        "- Include definitions, rules/tests, and examples.\n"
                        "- Use headings/subheadings and bullets.\n"
                        "- End cleanly.\n"
                    ),
                },
            ],
            max_tokens=3200,
            temperature=0.2,
        )

    parts = await asyncio.gather(*[summarize_chunk(c) for c in chunks])
    parts = [p.strip() for p in parts if (p or "").strip()]
    if not parts:
        return ""

    # Merge (pairwise so we don't have to slice input)
    async def merge_two(a: str, b: str) -> str:
        return await llm(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        "Combine these two note sets into ONE cohesive set.\n"
                        "- Keep the same style.\n"
                        "- Preserve details (do not over-compress).\n"
                        "- Remove duplicates.\n"
                        "- Keep LaTeX math.\n\n"
                        f"NOTES A:\n{a}\n\nNOTES B:\n{b}"
                    ),
                },
            ],
            max_tokens=3800,
            temperature=0.15,
        )

    merged = parts
    while len(merged) > 1:
        next_round = []
        for k in range(0, len(merged), 2):
            if k + 1 < len(merged):
                next_round.append((await merge_two(merged[k], merged[k + 1])).strip())
            else:
                next_round.append(merged[k])
        merged = next_round

    return merged[0].strip()


# -----------------------------
# processing-job helpers
# -----------------------------

def _update_job(
    job_id: str,
    *,
    status: str,
    stage: Optional[str] = None,
    error: Optional[str] = None,
    document_type: Optional[str] = None,
) -> None:
    """Update a document_processing_jobs row.  Swallows errors so the background
    task never crashes just because the jobs table is missing."""
    try:
        payload: dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if stage is not None:
            payload["stage"] = stage
        if error is not None:
            payload["error"] = error
        if document_type is not None:
            payload["document_type"] = document_type
        supabase.table("document_processing_jobs").update(payload).eq("id", job_id).execute()
    except Exception as exc:
        logger.warning(f"[processing_jobs] Could not update job {job_id}: {exc}")


# -----------------------------
# background AI work
# -----------------------------

async def _run_processing_job(
    *,
    job_id: str,
    doc_id: str,
    user_id: str,
    class_id: str,
    raw: bytes,
    filename: str,
    pdf_path: str,
    content_hash: str,
) -> None:
    """Run all heavy AI work after the upload response has been sent."""
    try:
        _update_job(job_id, status="processing", stage="extracting")

        # 1) Extract text
        text_content = extract_text_from_pdf(raw) or ""
        if len(text_content.strip()) < 100:
            _update_job(job_id, status="failed", stage="extracting",
                        error="Document contains insufficient extractable text (minimum 100 characters required)")
            return

        _update_job(job_id, status="processing", stage="classifying")

        # 2) Classify
        classification = await classify_and_recommend(text_content)
        cls = classification.get("classification", {}) if isinstance(classification, dict) else {}
        doc_type = (cls.get("document_type") or "document").lower()
        subject_area = (cls.get("subject_area") or "other").lower()

        _update_job(job_id, status="processing", stage="building", document_type=doc_type)

        # 3) Syllabus special path
        if doc_type == "syllabus":
            syllabus_data = await process_syllabus(text_content)
            summary_md = await _make_markdown_summary(text_content, word_target=1200)

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
                logger.warning(f"[syllabus_data] table missing or insert failed: {e}")

            try:
                supabase.table("classes").update({
                    "subject_area": subject_area,
                    "has_syllabus": True,
                }).eq("id", class_id).eq("user_id", user_id).execute()
            except Exception as e:
                logger.warning(f"[classes] could not update subject_area/has_syllabus: {e}")

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

            _update_job(job_id, status="completed", stage="finalizing", document_type="syllabus")
            return

        # 4) Knowledge graph extraction
        graph = await extract_knowledge_graph(text_content, max_nodes=12)
        concepts = graph.get("concepts", []) if isinstance(graph, dict) else []

        concepts_for_materials = []
        if isinstance(concepts, list):
            for c in concepts:
                concepts_for_materials.append({
                    "name": c.get("name"),
                    "definition": c.get("detailed") or c.get("simple") or "",
                    "example": c.get("example") or "",
                })

        mode = (graph.get("meta", {}) or {}).get("extraction_mode") if isinstance(graph, dict) else None
        subject_for_materials = mode if mode in {"stem", "humanities", "social_science"} else subject_area

        # 5) Generate materials + markdown summary in parallel
        materials_task = generate_all_materials(concepts_for_materials, subject_for_materials)
        summary_task = _make_markdown_summary(text_content, word_target=1600)
        materials, summary_md = await asyncio.gather(materials_task, summary_task)

        flashcards = materials.get("flashcards", []) if isinstance(materials, dict) else []
        cards_json = json.dumps({"cards": flashcards}, ensure_ascii=False)
        guide_json = json.dumps(graph, ensure_ascii=False)

        _update_job(job_id, status="processing", stage="finalizing")

        # 6) Store completed document
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

        # 7) Update concept graph
        try:
            await update_class_graph(class_id=class_id, doc_id=doc_id, guide_json=guide_json)
        except Exception as e:
            logger.warning(f"[graph] update_class_graph failed: {e}")

        # 8) Save classification metadata
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

        _update_job(job_id, status="completed", stage="finalizing", document_type=doc_type)

    except Exception as exc:
        logger.error(f"[processing_job] Job {job_id} failed: {exc}")
        _update_job(job_id, status="failed", error=str(exc))


# -----------------------------
# main: intelligent upload (fast-accept)
# -----------------------------

@router.post("/process-document/{class_id}")
async def process_document_intelligent(
    class_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(user_id_from_auth_header),
):
    """
    Upload ANY document and get subject-aware study materials.
    Returns quickly after uploading the PDF and creating a placeholder document.
    Heavy AI work (extraction, classification, materials generation) runs in the background.

    Poll GET /intelligent/process-status/{doc_id} to track progress.
    """

    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _as_uuid(class_id)

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    content_hash = sha256_bytes(raw)

    # Deduplication: if same content was already fully processed, return immediately
    existing_id = find_document_id_by_hash(user_id=user_id, content_hash=content_hash)
    if existing_id:
        try:
            job_res = (
                supabase.table("document_processing_jobs")
                .select("id,status,document_type")
                .eq("document_id", existing_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if job_res.data and job_res.data[0].get("status") == "completed":
                return {
                    "success": True,
                    "document_id": existing_id,
                    "job_id": job_res.data[0]["id"],
                    "status": "completed",
                    "document_type": job_res.data[0].get("document_type", "document"),
                    "message": "Document already processed (duplicate detected).",
                }
        except Exception:
            pass  # fall through to normal processing

    # Upload PDF to storage
    doc_id = new_uuid()
    pdf_path = upload_pdf_to_storage(
        user_id=user_id,
        doc_id=doc_id,
        raw_pdf=raw,
        filename=file.filename or "document.pdf",
    )

    # Create placeholder document row so downstream pages can find it by id
    upsert_document(
        user_id=user_id,
        doc_id=doc_id,
        class_id=class_id,
        title=file.filename or "Document",
        pdf_path=pdf_path,
        content_hash=content_hash,
    )

    # Create processing job record
    job_id = new_uuid()
    try:
        supabase.table("document_processing_jobs").insert({
            "id": job_id,
            "document_id": doc_id,
            "user_id": user_id,
            "class_id": class_id,
            "status": "queued",
            "stage": "queued",
        }).execute()
    except Exception as e:
        logger.warning(f"[processing_jobs] Could not create job record: {e}")

    # Schedule background processing
    background_tasks.add_task(
        _run_processing_job,
        job_id=job_id,
        doc_id=doc_id,
        user_id=user_id,
        class_id=class_id,
        raw=raw,
        filename=file.filename or "document.pdf",
        pdf_path=pdf_path,
        content_hash=content_hash,
    )

    return {
        "success": True,
        "document_id": doc_id,
        "job_id": job_id,
        "status": "queued",
        "message": "Upload accepted. Processing in background.",
    }


# -----------------------------
# status endpoint
# -----------------------------

@router.get("/process-status/{doc_id}")
async def get_process_status(
    doc_id: str,
    user_id: str = Depends(user_id_from_auth_header),
):
    """
    Poll this endpoint after upload to track background processing.

    Returns:
    - status: queued | processing | completed | failed
    - stage: current processing stage
    - error: error message (if failed)
    - document_id
    - document_type: document | syllabus (once known)
    - class_id
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    doc_id = _as_uuid(doc_id)

    try:
        job_res = (
            supabase.table("document_processing_jobs")
            .select("id,status,stage,error,document_type,class_id,created_at,updated_at")
            .eq("document_id", doc_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not query processing status: {e}")

    if not job_res.data:
        raise HTTPException(status_code=404, detail="No processing job found for this document")

    row = job_res.data[0]
    return {
        "document_id": doc_id,
        "job_id": row["id"],
        "status": row.get("status", "unknown"),
        "stage": row.get("stage"),
        "error": row.get("error"),
        "document_type": row.get("document_type"),
        "class_id": row.get("class_id"),
    }


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
