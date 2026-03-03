from fastapi import APIRouter, Depends
from ..auth import user_id_from_auth_header
from ..supabase import supabase

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/run-one")
def run_one_job(user_id: str = Depends(user_id_from_auth_header)):
    # pull oldest queued job owned by user (easy start)
    res = supabase.table("graph_jobs") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("status", "queued") \
        .order("created_at", desc=False) \
        .limit(1) \
        .execute()

    if not res.data:
        return {"ran": False, "reason": "no queued jobs"}

    return {"ran": False, "reason": "graph job runner not implemented"}