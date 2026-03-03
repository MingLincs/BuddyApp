"""app/services/job_store.py

In-memory job status store for tracking background document processing.
Keyed by doc_id. Lives for the lifetime of the server process.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

_jobs: Dict[str, Dict[str, Any]] = {}


def create_job(doc_id: str) -> None:
    """Create a new job entry in queued state."""
    _jobs[doc_id] = {
        "status": "queued",
        "stage": "queued",
        "error": None,
        "document_id": doc_id,
    }


def update_job(doc_id: str, **kwargs: Any) -> None:
    """Update fields on an existing job."""
    if doc_id in _jobs:
        _jobs[doc_id].update(kwargs)


def get_job(doc_id: str) -> Optional[Dict[str, Any]]:
    """Return job dict or None if not found."""
    return _jobs.get(doc_id)
