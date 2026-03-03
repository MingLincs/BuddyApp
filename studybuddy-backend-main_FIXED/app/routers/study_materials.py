# app/routers/study_materials.py
"""
Study Material Generation API

- Class-level: generate quiz/flashcards from all class documents + concepts
- Document-level: generate quiz/flashcards from a single document
- Reloads saved results to avoid unnecessary regeneration
"""

from __future__ import annotations

import json
import asyncio
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from ..auth import user_id_from_auth_header
from ..supabase import supabase
from ..services.db import new_uuid, insert_quiz, upsert_document, upsert_study_material
from ..services.auto_study_materials import generate_flashcards
from ..services.llm import llm
from ..services.json_utils import safe_json_loads

router = APIRouter(tags=["study-materials"])


# ------------------------------------------------
# Helpers
# ------------------------------------------------

def _valid_uuid(s: str) -> str:
    try:
        UUID(str(s))
        return str(s)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _extract_concepts_from_guide(guide_json_val: Optional[Any]) -> List[Dict]:
    """Extract concepts in a usable format from guide_json (string or dict)."""
    if not guide_json_val:
        return []
    try:
        guide = (
            guide_json_val
            if isinstance(guide_json_val, dict)
            else json.loads(guide_json_val)
        )
        concepts = guide.get("concepts", [])
        if not isinstance(concepts, list):
            return []
        result = []
        for c in concepts:
            if isinstance(c, dict) and c.get("name"):
                result.append({
                    "name": c.get("name", ""),
                    "definition": c.get("detailed") or c.get("simple") or c.get("definition") or "",
                    "example": c.get("example") or "",
                    "importance": c.get("importance", "important"),
                })
        return result
    except Exception:
        return []


def _extract_cards_from_json(cards_json_val: Optional[Any]) -> List[Dict]:
    """Extract flashcards from cards_json (string or dict)."""
    if not cards_json_val:
        return []
    try:
        data = (
            cards_json_val
            if isinstance(cards_json_val, dict)
            else json.loads(cards_json_val)
        )
        return data.get("cards", [])
    except Exception:
        return []


async def _generate_quiz_from_context(
    title: str,
    concepts: List[Dict],
    summaries: List[str],
    num_questions: int = 15,
) -> Dict:
    """Generate a quiz using concepts + summaries context."""
    concept_text = "\n".join([
        f"- {c['name']}: {c.get('definition', '')[:200]}"
        for c in concepts[:20]
    ])
    summary_text = "\n\n---\n\n".join([s[:2500] for s in summaries[:4]])

    context = f"""Topic: {title}

KEY CONCEPTS:
{concept_text}

STUDY MATERIAL:
{summary_text}""".strip()

    prompt = (
        f"Create {num_questions} high-quality multiple-choice questions for a student studying '{title}'.\n\n"
        f"Context:\n{context[:9000]}\n\n"
        "Requirements:\n"
        "- Cover the most important concepts\n"
        "- Test understanding, not just memorization\n"
        "- Each question must have exactly 4 choices\n"
        "- Include clear explanations\n\n"
        "Return ONLY valid JSON:\n"
        '{"questions": [{"question": "...", "choices": ["A", "B", "C", "D"], '
        '"answer_index": 0, "explanation": "...", "source": "Course material"}]}'
    )

    sys_msg = "Return only valid JSON. No markdown fences. No extra text."

    raw = await llm(
        [{"role": "system", "content": sys_msg}, {"role": "user", "content": prompt}],
        max_tokens=3200,
        temperature=0.2,
    )

    try:
        return json.loads(raw)
    except Exception:
        repaired = await llm(
            [
                {"role": "system", "content": sys_msg},
                {"role": "user", "content": "Repair to valid JSON:\n" + raw},
            ],
            max_tokens=3200,
        )
        return json.loads(repaired)


async def _generate_flashcards_from_context(
    title: str,
    concepts: List[Dict],
    summaries: List[str],
    subject_area: str = "other",
) -> List[Dict]:
    """Generate flashcards using concepts + summaries context."""
    if concepts:
        cards = await generate_flashcards(concepts[:15], subject_area)
        if cards:
            return cards

    # Fallback: generate from summaries
    combined = "\n\n---\n\n".join([s[:2000] for s in summaries[:4]])
    prompt = (
        f"Create comprehensive study flashcards for '{title}'.\n\n"
        f"Material:\n{combined[:6000]}\n\n"
        "Return ONLY valid JSON:\n"
        '{"flashcards": [{"front": "Question", "back": "Answer", '
        '"type": "definition", "difficulty": "medium", "concept_name": "Topic"}]}\n'
        "Create 15-20 cards covering all major concepts."
    )

    raw = await llm(
        [{"role": "system", "content": "Return only valid JSON."}, {"role": "user", "content": prompt}],
        max_tokens=2000,
        temperature=0.3,
    )

    result = safe_json_loads(raw, default={"flashcards": []})
    cards = result.get("flashcards", []) if isinstance(result, dict) else []
    return cards if isinstance(cards, list) else []


# ------------------------------------------------
# GET /intelligent/materials/{class_id}/flashcards
# (called by existing flashcards page)
# ------------------------------------------------

@router.get("/intelligent/materials/{class_id}/flashcards")
async def get_class_flashcards_intelligent(
    class_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Aggregate flashcards from all documents in a class (used by flashcards page)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _valid_uuid(class_id)

    cls_res = (
        supabase.table("classes")
        .select("id,name,subject_area")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not cls_res.data:
        raise HTTPException(status_code=404, detail="Class not found")

    docs_res = (
        supabase.table("documents")
        .select("id,title,cards_json,guide_json,summary")
        .eq("class_id", class_id)
        .eq("user_id", user_id)
        .execute()
    )
    docs = docs_res.data or []

    # Aggregate existing flashcards, deduplicating by front text
    all_cards: List[Dict] = []
    seen_fronts: set = set()

    for doc in docs:
        for card in _extract_cards_from_json(doc.get("cards_json")):
            front = card.get("front", "")
            if front and front not in seen_fronts:
                seen_fronts.add(front)
                all_cards.append(card)

    # If no stored cards, generate on-the-fly from concepts/summaries
    if not all_cards:
        all_concepts: List[Dict] = []
        summaries: List[str] = []
        seen_names: set = set()

        for doc in docs:
            for c in _extract_concepts_from_guide(doc.get("guide_json")):
                if c["name"] not in seen_names:
                    seen_names.add(c["name"])
                    all_concepts.append(c)
            if doc.get("summary"):
                summaries.append(doc["summary"])

        if all_concepts or summaries:
            subject_area = (cls_res.data.get("subject_area") or "other").lower()
            all_cards = await _generate_flashcards_from_context(
                title=cls_res.data.get("name", "Class"),
                concepts=all_concepts,
                summaries=summaries,
                subject_area=subject_area,
            )

    return {"flashcards": all_cards, "count": len(all_cards)}


# ------------------------------------------------
# Class-level endpoints
# ------------------------------------------------

@router.post("/classes/{class_id}/generate-quiz")
async def generate_class_quiz(
    class_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Generate a comprehensive quiz from all class documents and concepts."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _valid_uuid(class_id)

    cls_res = (
        supabase.table("classes")
        .select("id,name,subject_area")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not cls_res.data:
        raise HTTPException(status_code=404, detail="Class not found")

    class_name = cls_res.data.get("name", "Class")

    docs_res = (
        supabase.table("documents")
        .select("id,title,summary,guide_json")
        .eq("class_id", class_id)
        .eq("user_id", user_id)
        .execute()
    )
    docs = docs_res.data or []

    if not docs:
        raise HTTPException(
            status_code=422,
            detail="No documents found for this class. Upload documents first.",
        )

    all_concepts: List[Dict] = []
    summaries: List[str] = []
    seen_names: set = set()

    for doc in docs:
        for c in _extract_concepts_from_guide(doc.get("guide_json")):
            if c["name"] not in seen_names:
                seen_names.add(c["name"])
                all_concepts.append(c)
        if doc.get("summary"):
            summaries.append(f"## {doc.get('title', 'Document')}\n{doc['summary']}")

    # Also pull class-level concepts from the concepts table
    try:
        concepts_res = (
            supabase.table("concepts")
            .select("canonical_name,canonical_description,importance_score")
            .eq("class_id", class_id)
            .execute()
        )
        for c in concepts_res.data or []:
            cname = c.get("canonical_name", "")
            if cname and cname not in seen_names:
                seen_names.add(cname)
                all_concepts.append({
                    "name": cname,
                    "definition": c.get("canonical_description", ""),
                    "importance": c.get("importance_score", 1),
                })
    except Exception as e:
        logger.warning(f"[generate_class_quiz] concepts table: {e}")

    quiz_obj = await _generate_quiz_from_context(
        title=class_name,
        concepts=all_concepts,
        summaries=summaries,
        num_questions=18,
    )

    questions = quiz_obj.get("questions", [])
    quiz_id = new_uuid()
    quiz_title = f"{class_name} – Class Quiz"
    quiz_json_str = json.dumps(quiz_obj, ensure_ascii=False)

    # Store class-level quiz in study_materials.quiz_questions (quizzes table has no class_id)
    try:
        upsert_study_material(
            class_id=class_id,
            material_type="class_quiz",
            subject_area=(cls_res.data.get("subject_area") or "other").lower(),
            quiz_questions=quiz_json_str,
        )
    except Exception as e:
        logger.warning(f"[generate_class_quiz] save to study_materials: {e}")

    return {
        "id": quiz_id,
        "title": quiz_title,
        "num_questions": len(questions),
        "quiz_json": quiz_json_str,
    }


@router.post("/classes/{class_id}/generate-flashcards")
async def generate_class_flashcards(
    class_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Generate comprehensive flashcards from all class documents."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _valid_uuid(class_id)

    cls_res = (
        supabase.table("classes")
        .select("id,name,subject_area")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not cls_res.data:
        raise HTTPException(status_code=404, detail="Class not found")

    class_name = cls_res.data.get("name", "Class")
    subject_area = (cls_res.data.get("subject_area") or "other").lower()

    docs_res = (
        supabase.table("documents")
        .select("id,title,summary,guide_json")
        .eq("class_id", class_id)
        .eq("user_id", user_id)
        .execute()
    )
    docs = docs_res.data or []

    if not docs:
        raise HTTPException(
            status_code=422,
            detail="No documents found for this class. Upload documents first.",
        )

    all_concepts: List[Dict] = []
    summaries: List[str] = []
    seen_names: set = set()

    for doc in docs:
        for c in _extract_concepts_from_guide(doc.get("guide_json")):
            if c["name"] not in seen_names:
                seen_names.add(c["name"])
                all_concepts.append(c)
        if doc.get("summary"):
            summaries.append(doc["summary"])

    cards = await _generate_flashcards_from_context(
        title=class_name,
        concepts=all_concepts,
        summaries=summaries,
        subject_area=subject_area,
    )

    # Persist class-level flashcards to study_materials.flashcards
    try:
        upsert_study_material(
            class_id=class_id,
            material_type="class_flashcards",
            subject_area=subject_area,
            flashcards=json.dumps(cards, ensure_ascii=False),
        )
    except Exception as e:
        logger.warning(f"[generate_class_flashcards] save flashcards: {e}")

    return {
        "flashcards": cards,
        "count": len(cards),
        "class_name": class_name,
    }


@router.get("/classes/{class_id}/study-materials")
async def get_class_study_materials(
    class_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Get previously generated study materials (quizzes + flashcard counts) for a class."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    class_id = _valid_uuid(class_id)

    cls_res = (
        supabase.table("classes")
        .select("id,name")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not cls_res.data:
        raise HTTPException(status_code=404, detail="Class not found")

    # Load class-level quiz from study_materials (quizzes table has no class_id column)
    quiz_available = False
    quiz_title = ""
    quiz_question_count = 0
    quiz_json_cached: Optional[str] = None
    quiz_generated_at = ""
    try:
        sm_res = (
            supabase.table("study_materials")
            .select("id,quiz_questions,generated_at")
            .eq("class_id", class_id)
            .eq("material_type", "class_quiz")
            .order("generated_at", desc=True)
            .limit(1)
            .execute()
        )
        if sm_res.data:
            row = sm_res.data[0]
            qj = row.get("quiz_questions")
            if qj:
                try:
                    qobj = json.loads(qj) if isinstance(qj, str) else qj
                    qs = qobj.get("questions", [])
                    quiz_available = True
                    quiz_title = f"{cls_res.data.get('name', 'Class')} – Class Quiz"
                    quiz_question_count = len(qs)
                    quiz_generated_at = row.get("generated_at", "")
                    # Store quiz_json string so frontend can load it inline
                    quiz_json_cached = qj if isinstance(qj, str) else json.dumps(qj, ensure_ascii=False)
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"[get_class_study_materials] study_materials: {e}")

    # Load class-level flashcards count from study_materials
    sm_cards_count = 0
    try:
        sm_fc_res = (
            supabase.table("study_materials")
            .select("flashcards")
            .eq("class_id", class_id)
            .eq("material_type", "class_flashcards")
            .limit(1)
            .execute()
        )
        if sm_fc_res.data:
            fc_val = sm_fc_res.data[0].get("flashcards")
            if fc_val:
                try:
                    fc_obj = json.loads(fc_val) if isinstance(fc_val, str) else fc_val
                    fc_list = fc_obj if isinstance(fc_obj, list) else fc_obj.get("cards", [])
                    sm_cards_count = len(fc_list)
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"[get_class_study_materials] flashcards: {e}")

    docs_res = (
        supabase.table("documents")
        .select("cards_json")
        .eq("class_id", class_id)
        .eq("user_id", user_id)
        .execute()
    )
    doc_cards_count = sum(
        len(_extract_cards_from_json(d.get("cards_json")))
        for d in (docs_res.data or [])
    )
    total_cards = sm_cards_count if sm_cards_count > 0 else doc_cards_count

    # Build a quiz summary compatible with the frontend's quizzes list shape
    quizzes: List[Dict] = []
    if quiz_available:
        quiz_entry: Dict = {
            "id": "class_quiz",
            "title": quiz_title,
            "num_questions": quiz_question_count,
            "created_at": quiz_generated_at,
        }
        if quiz_json_cached:
            quiz_entry["quiz_json"] = quiz_json_cached
        quizzes = [quiz_entry]

    return {
        "quizzes": quizzes,
        "flashcard_count": total_cards,
        "has_quizzes": quiz_available,
        "has_flashcards": total_cards > 0,
    }


# ------------------------------------------------
# Document-level endpoints
# ------------------------------------------------

@router.post("/documents/{doc_id}/generate-quiz")
async def generate_document_quiz(
    doc_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Generate a quiz from a specific uploaded document."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    doc_id = _valid_uuid(doc_id)

    doc_res = (
        supabase.table("documents")
        .select("id,title,summary,guide_json,class_id")
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = doc_res.data
    title = doc.get("title", "Document")

    concepts = _extract_concepts_from_guide(doc.get("guide_json"))
    summary = doc.get("summary") or ""

    quiz_obj = await _generate_quiz_from_context(
        title=title,
        concepts=concepts,
        summaries=[summary] if summary else [],
        num_questions=12,
    )

    questions = quiz_obj.get("questions", [])
    quiz_id = new_uuid()
    quiz_title = f"{title} – Quiz"
    quiz_json_str = json.dumps(quiz_obj, ensure_ascii=False)

    # Store document-level quiz in quizzes table using doc_id (no class_id on quizzes)
    try:
        insert_quiz(
            user_id=user_id,
            doc_id=doc_id,
            title=quiz_title,
            quiz_json=quiz_json_str,
            num_questions=len(questions),
        )
    except Exception as e:
        logger.warning(f"[generate_document_quiz] save quiz: {e}")

    return {
        "id": quiz_id,
        "title": quiz_title,
        "num_questions": len(questions),
        "quiz_json": quiz_json_str,
    }


@router.post("/documents/{doc_id}/generate-flashcards")
async def generate_document_flashcards(
    doc_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Generate flashcards from a specific uploaded document."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    doc_id = _valid_uuid(doc_id)

    doc_res = (
        supabase.table("documents")
        .select("id,title,summary,guide_json,class_id")
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = doc_res.data
    title = doc.get("title", "Document")
    class_id = doc.get("class_id")
    concepts = _extract_concepts_from_guide(doc.get("guide_json"))
    summary = doc.get("summary") or ""

    # Resolve subject area from class
    subject_area = "other"
    if class_id:
        try:
            cls_res = (
                supabase.table("classes")
                .select("subject_area")
                .eq("id", class_id)
                .maybe_single()
                .execute()
            )
            if cls_res.data:
                subject_area = (cls_res.data.get("subject_area") or "other").lower()
        except Exception:
            pass

    cards = await _generate_flashcards_from_context(
        title=title,
        concepts=concepts,
        summaries=[summary] if summary else [],
        subject_area=subject_area,
    )

    # Persist updated cards back to document
    try:
        upsert_document(
            user_id=user_id,
            doc_id=doc_id,
            title=title,
            cards_json=json.dumps({"cards": cards}, ensure_ascii=False),
        )
    except Exception as e:
        logger.warning(f"[generate_document_flashcards] save cards: {e}")

    return {
        "flashcards": cards,
        "count": len(cards),
    }


@router.get("/documents/{doc_id}/study-materials")
async def get_document_study_materials(
    doc_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header),
):
    """Get previously generated study materials (flashcards + quizzes) for a document."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    doc_id = _valid_uuid(doc_id)

    doc_res = (
        supabase.table("documents")
        .select("id,title,cards_json")
        .eq("id", doc_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found")

    cards = _extract_cards_from_json(doc_res.data.get("cards_json"))

    quizzes: List[Dict] = []
    try:
        quizzes_res = (
            supabase.table("quizzes")
            .select("id,title,num_questions,created_at")
            .eq("doc_id", doc_id)
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        quizzes = quizzes_res.data or []
    except Exception as e:
        logger.warning(f"[get_document_study_materials] quizzes: {e}")

    return {
        "flashcards": cards,
        "flashcard_count": len(cards),
        "quizzes": quizzes,
        "has_flashcards": len(cards) > 0,
        "has_quizzes": len(quizzes) > 0,
    }
