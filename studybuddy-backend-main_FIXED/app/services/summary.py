"""app/services/summary.py

High-quality, chunked markdown summary generation.
Uses the full document text (up to 90k chars), splits into overlapping chunks,
summarises each chunk, then merges pairwise - preserving detail and LaTeX math.
"""

from __future__ import annotations

import asyncio
import re

from .llm import llm


async def make_markdown_summary(text_content: str, *, word_target: int = 1600) -> str:
    """
    Generate a detailed structured markdown summary of *text_content*.

    Strategy
    --------
    1. Clean obvious PDF UI noise.
    2. Allow up to 90 000 chars (far more than the old 18 k single-shot path).
    3. Split into overlapping chunks of ~14 000 chars.
    4. Summarise each chunk in parallel.
    5. Merge summaries pairwise until one remains.

    The result is as good as or better than the pre-refactor single-shot path
    for any document length, and much better for long documents.
    """
    src_full = (text_content or "").strip()
    if not src_full:
        return ""

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
    src_full = src_full[:90000]

    # Build overlapping chunks
    chunk_size = 14000
    overlap = 900
    chunks: list[str] = []
    i = 0
    while i < len(src_full):
        j = min(len(src_full), i + chunk_size)
        chunks.append(src_full[i:j])
        if j == len(src_full):
            break
        i = max(0, j - overlap)

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
                        f"- Write dense, complete study notes (~{per_chunk_words}–{per_chunk_words + 300} words).\n"
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
        next_round: list[str] = []
        for k in range(0, len(merged), 2):
            if k + 1 < len(merged):
                next_round.append((await merge_two(merged[k], merged[k + 1])).strip())
            else:
                next_round.append(merged[k])
        merged = next_round

    return merged[0].strip()
