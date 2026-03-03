from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from openai import APIError, AuthenticationError, RateLimitError
import tempfile
import os
import json
import asyncio
from loguru import logger

from ..services.cache import sha256_bytes
from ..services.pdf import build_bullets_from_pdf, extract_text_from_pdf
from ..services.llm import llm
from ..services.parse import parse_cards
from ..services.db import upsert_document, upload_pdf_to_storage, new_uuid
from ..services.concept_engine import update_class_graph
from ..services.knowledge_graph import extract_knowledge_graph
from ..services.job_store import create_job, update_job, get_job
from ..services.summary import make_markdown_summary
from ..auth import user_id_from_auth_header

router = APIRouter()

# Keep strong references to running background tasks to prevent GC cancellation.
_background_tasks: set[asyncio.Task] = set()


# --------------------------------------------------
# CONCEPT PROMPT
# --------------------------------------------------

CONCEPT_PROMPT = """
You are building structured study concepts from a textbook chapter.

Return ONLY valid JSON:

{
  "concepts": [
    {
      "name": "Concept Name",
      "importance": "core|important|advanced",
      "difficulty": "easy|medium|hard",
      "simple": "Short intuitive explanation",
      "detailed": "Deeper explanation with structure and reasoning",
      "technical": "More formal or technical description",
      "example": "Clear real-world example",
      "common_mistake": "Typical misunderstanding students make"
    }
  ]
}

Rules:
- Generate 6–10 high-quality concepts
- Concepts must be meaningful
- Detailed explanations must be rich (4–6 sentences)
- Examples must be concrete
- Common mistakes must be realistic
- Stay faithful to the provided text
"""


# --------------------------------------------------
# BACKGROUND TASK
# --------------------------------------------------

async def _background_upload_process(
    *,
    doc_id: str,
    user_id: str,
    class_id: str | None,
    title: str,
    tmp_path: str,
    content_hash: str,
    pdf_path: str,
    want_summary: bool,
    want_cards: bool,
    want_guide: bool,
    word_target: int,
) -> None:
    """Full AI pipeline for /upload, run after the HTTP response is returned."""
    try:
        update_job(doc_id, status="processing", stage="extracting")

        # Extract full text (high-quality path – no per-page bullet compression)
        with open(tmp_path, "rb") as f:
            text_content = extract_text_from_pdf(f.read()) or ""
        if not text_content.strip():
            # Fallback: bullet-based extraction for image-heavy PDFs
            joined, _ = await build_bullets_from_pdf(tmp_path, content_hash)
            text_content = joined

        tasks: dict[str, asyncio.Task] = {}

        # Summary – use high-quality chunked path
        if want_summary:
            update_job(doc_id, stage="generating_summary")
            tasks["summary"] = asyncio.ensure_future(
                make_markdown_summary(text_content, word_target=word_target)
            )

        # Knowledge graph
        if want_guide:
            tasks["graph"] = asyncio.ensure_future(
                extract_knowledge_graph(text_content, max_nodes=12)
            )

        update_job(doc_id, stage="building_materials")
        results: dict = {}
        if tasks:
            keys = list(tasks.keys())
            values = await asyncio.gather(*[tasks[k] for k in keys], return_exceptions=True)
            results = dict(zip(keys, values))

        summary = results.get("summary") or ""
        if isinstance(summary, Exception):
            summary = ""

        graph = results.get("graph", {})
        if isinstance(graph, Exception):
            graph = {}
        if not isinstance(graph, dict):
            graph = {}

        guide_json = "{}"
        if want_guide and graph.get("concepts"):
            guide_json = json.dumps(graph, ensure_ascii=False)

        # Flashcards
        cards_json = json.dumps({"cards": []})
        if want_cards:
            try:
                concepts = graph.get("concepts") if isinstance(graph, dict) else None
                if isinstance(concepts, list) and concepts:
                    concept_lines = "\n".join(
                        f"- {c.get('name')}: {c.get('simple', '')}" for c in concepts[:12]
                    )
                    cards_resp = await llm(
                        [
                            {
                                "role": "system",
                                "content": 'Return ONLY valid JSON: {"cards":[{"type":"definition|qa|concept","front":"...","back":"..."}]}. Make cards exam-focused.',
                            },
                            {
                                "role": "user",
                                "content": "Create 20–30 high-quality flashcards from these core concepts:\n\n" + concept_lines,
                            },
                        ],
                        max_tokens=2000,
                        temperature=0.2,
                    )
                    parsed_cards = parse_cards(cards_resp)
                    cards_json = json.dumps(parsed_cards, ensure_ascii=False)
                else:
                    cards_resp = await llm(
                        [
                            {
                                "role": "system",
                                "content": 'Return ONLY valid JSON: {"cards":[{"type":"definition|qa|concept","front":"...","back":"..."}]}.',
                            },
                            {
                                "role": "user",
                                "content": "Create 20–30 high-quality flashcards from this content:\n\n" + text_content[:15000],
                            },
                        ],
                        max_tokens=2000,
                        temperature=0.2,
                    )
                    parsed_cards = parse_cards(cards_resp)
                    cards_json = json.dumps(parsed_cards, ensure_ascii=False)
            except Exception:
                cards_json = json.dumps({"cards": []})

        update_job(doc_id, stage="finalizing")

        # Persist final document
        upsert_document(
            user_id=user_id,
            class_id=class_id,
            doc_id=doc_id,
            title=title,
            summary=summary,
            cards_json=cards_json,
            guide_json=guide_json,
            pdf_path=pdf_path,
            content_hash=content_hash,
        )

        # Update concept graph
        if want_guide and guide_json != "{}":
            try:
                await update_class_graph(
                    class_id=class_id,
                    doc_id=doc_id,
                    guide_json=guide_json,
                )
            except Exception as e:
                logger.warning(f"[graph] update_class_graph failed: {e}")

        update_job(doc_id, status="completed", stage="completed")

    except Exception as exc:
        logger.error(f"[background/upload] processing failed for {doc_id}: {exc}")
        update_job(doc_id, status="failed", stage="failed", error=str(exc))
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass


# --------------------------------------------------
# UPLOAD ENDPOINT
# --------------------------------------------------

@router.post("/upload")
async def upload(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form("Comprehensive Study Notes"),
    class_id: str | None = Form(None),
    make_summary: str = Form("1"),
    make_cards: str = Form("1"),
    make_guide: str = Form("1"),
    word_target: int = Form(3000),
):

    # ----------------------------
    # Validate file
    # ----------------------------

    raw = await file.read()

    if not raw:
        raise HTTPException(400, "Empty file.")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF supported.")

    # ----------------------------
    # Auth
    # ----------------------------

    user_id = user_id_from_auth_header(request.headers.get("Authorization"))
    if not user_id:
        raise HTTPException(401, "Login required.")

    if not class_id:
        raise HTTPException(400, "class_id required.")

    # ----------------------------
    # Flags
    # ----------------------------

    to_bool = lambda v: str(v).lower() in ("1", "true", "yes", "on")
    want_summary = to_bool(make_summary)
    want_cards = to_bool(make_cards)
    want_guide = to_bool(make_guide)

    if not (want_summary or want_cards or want_guide):
        raise HTTPException(400, "Select at least one option.")

    doc_id = new_uuid()
    content_hash = sha256_bytes(raw)

    # ----------------------------
    # Temp save PDF
    # ----------------------------

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    # ----------------------------
    # Upload PDF to storage
    # ----------------------------

    try:
        pdf_path = upload_pdf_to_storage(
            user_id=user_id,
            doc_id=doc_id,
            raw_pdf=raw,
            filename=file.filename,
        )
    except Exception as e:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        raise HTTPException(502, f"Storage upload failed: {e}")

    # ----------------------------
    # Create placeholder document row
    # ----------------------------

    upsert_document(
        user_id=user_id,
        class_id=class_id,
        doc_id=doc_id,
        title=title,
        summary="",
        cards_json=json.dumps({"cards": []}),
        guide_json="{}",
        pdf_path=pdf_path,
        content_hash=content_hash,
    )

    # ----------------------------
    # Register job + fire background task
    # ----------------------------

    create_job(doc_id)

    task = asyncio.create_task(
        _background_upload_process(
            doc_id=doc_id,
            user_id=user_id,
            class_id=class_id,
            title=title,
            tmp_path=tmp_path,
            content_hash=content_hash,
            pdf_path=pdf_path,
            want_summary=want_summary,
            want_cards=want_cards,
            want_guide=want_guide,
            word_target=word_target,
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return {
        "id": doc_id,
        "status": "queued",
        "status_url": f"/upload/status/{doc_id}",
    }


# --------------------------------------------------
# STATUS ENDPOINT
# --------------------------------------------------

@router.get("/upload/status/{doc_id}")
async def upload_status(doc_id: str, request: Request):
    """Poll processing status for a document uploaded via /upload."""
    user_id = user_id_from_auth_header(request.headers.get("Authorization"))
    if not user_id:
        raise HTTPException(401, "Login required.")

    job = get_job(doc_id)
    if job is None:
        raise HTTPException(404, "Job not found.")

    return job
