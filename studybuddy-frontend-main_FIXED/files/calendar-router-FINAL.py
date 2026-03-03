from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from icalendar import Calendar
from datetime import datetime
import re
import json

from ..auth import user_id_from_auth_header
from ..supabase import supabase
from ..services.db import new_uuid
from ..services.llm import llm

router = APIRouter(prefix="/calendar", tags=["calendar"])


class AssignmentCreate(BaseModel):
    title: str
    class_id: str
    description: Optional[str] = None
    points: Optional[int] = None
    due_date: str


def extract_class_name_from_summary(summary: str) -> Optional[str]:
    """Extract class name from Canvas assignment summary"""
    match = re.search(r'\[(.*?)\]', summary)
    if match:
        return match.group(1).strip()
    return None


async def find_matching_class(user_id: str, course_code: str) -> Optional[dict]:
    """Find a class that matches the course code using OpenAI"""
    # Get all user's classes
    result = (
        supabase
        .table("classes")
        .select("id,name")
        .eq("user_id", user_id)
        .execute()
    )
    
    if not result.data:
        return None
    
    classes = result.data
    
    # Try exact match first
    for cls in classes:
        if course_code.lower() in cls['name'].lower() or cls['name'].lower() in course_code.lower():
            return cls
    
    # Use OpenAI for fuzzy matching
    try:
        class_list = "\n".join([f"- {cls['name']}" for cls in classes])
        
        prompt = f"""Given this course code from a calendar: "{course_code}"

And these existing classes:
{class_list}

Which class does it match best? Return ONLY the exact class name from the list, or return "NONE" if no good match exists.

Consider:
- Partial matches (e.g., "CS 101" matches "Computer Science 101")
- Abbreviations (e.g., "INFOTC" matches "Information Technology")
- Course codes (e.g., "4400" could match "INFOTC-4400")

Return ONLY the class name, nothing else."""

        messages = [
            {"role": "system", "content": "You match course codes to class names. Return only the class name or NONE."},
            {"role": "user", "content": prompt}
        ]
        
        match_result = await llm(messages, max_tokens=100, temperature=0)
        match_result = match_result.strip()
        
        if match_result != "NONE":
            for cls in classes:
                if cls['name'].lower() == match_result.lower():
                    return cls
                    
    except Exception as e:
        print(f"LLM matching failed: {e}")
        pass
    
    return None


@router.post("/assignments/create")
async def create_assignment(
    payload: AssignmentCreate,
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Manually create a new assignment"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    # Verify class ownership
    check = (
        supabase
        .table("classes")
        .select("id")
        .eq("id", payload.class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    
    if not check.data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    try:
        result = (
            supabase
            .table("assignments")
            .insert({
                "id": new_uuid(),
                "class_id": payload.class_id,
                "user_id": user_id,
                "title": payload.title,
                "description": payload.description,
                "due_date": payload.due_date,
                "points": payload.points,
                "completed": False,
                "source": "manual"
            })
            .execute()
        )
        
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_icalendar(
    file: UploadFile = File(...),
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Import assignments from an iCalendar (.ics) file"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    if not file.filename.endswith('.ics'):
        raise HTTPException(status_code=400, detail="Only .ics files are supported")
    
    file_content = await file.read()
    
    try:
        cal = Calendar.from_ical(file_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid iCalendar file: {str(e)}")
    
    assignments_created = 0
    assignments_skipped = 0
    matched_classes = set()
    
    # Process each event
    for component in cal.walk('VEVENT'):
        try:
            summary = str(component.get('summary', ''))
            description = str(component.get('description', ''))
            due_date = component.get('dtstart')
            
            # Extract class name from summary
            course_code = extract_class_name_from_summary(summary)
            
            if not course_code:
                assignments_skipped += 1
                continue
            
            # Find matching class
            matched_class = await find_matching_class(user_id, course_code)
            
            if not matched_class:
                assignments_skipped += 1
                continue
            
            # Parse due date
            if due_date:
                if hasattr(due_date.dt, 'isoformat'):
                    due_date_str = due_date.dt.isoformat()
                else:
                    due_date_str = str(due_date.dt)
            else:
                due_date_str = None
            
            # Clean up title (remove course code in brackets)
            title = re.sub(r'\[.*?\]', '', summary).strip()
            if not title:
                title = summary
            
            # Truncate description
            if description and len(description) > 500:
                description = description[:500] + "..."
            
            # Create assignment
            try:
                supabase.table("assignments").insert({
                    "id": new_uuid(),
                    "class_id": matched_class['id'],
                    "user_id": user_id,
                    "title": title,
                    "description": description if description else None,
                    "due_date": due_date_str,
                    "completed": False,
                    "source": "icalendar_import"
                }).execute()
                
                assignments_created += 1
                matched_classes.add(matched_class['name'])
                
            except Exception as e:
                print(f"Error creating assignment: {e}")
                assignments_skipped += 1
                
        except Exception as e:
            print(f"Error processing event: {e}")
            assignments_skipped += 1
            continue
    
    return {
        "success": True,
        "assignments_created": assignments_created,
        "assignments_skipped": assignments_skipped,
        "matched_classes": list(matched_classes),
        "message": f"Imported {assignments_created} assignments across {len(matched_classes)} classes"
    }


@router.get("/assignments")
def get_all_assignments(
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Get all assignments for the user"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    try:
        result = (
            supabase
            .table("assignments")
            .select("*, classes(name, id)")
            .eq("user_id", user_id)
            .order("due_date", desc=False)
            .execute()
        )
        
        return result.data or []
    except Exception as e:
        print(f"Error fetching assignments: {e}")
        return []


@router.get("/assignments/upcoming")
def get_upcoming_assignments(
    limit: int = 10,
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Get upcoming assignments"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    try:
        now = datetime.utcnow().isoformat()
        
        result = (
            supabase
            .table("assignments")
            .select("*, classes(name, id)")
            .eq("user_id", user_id)
            .eq("completed", False)
            .gte("due_date", now)
            .order("due_date", desc=False)
            .limit(limit)
            .execute()
        )
        
        return result.data or []
    except Exception as e:
        print(f"Error fetching upcoming assignments: {e}")
        return []


@router.patch("/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str,
    completed: bool,
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Mark assignment as complete/incomplete"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    try:
        result = (
            supabase
            .table("assignments")
            .update({"completed": completed})
            .eq("id", assignment_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Delete an assignment"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    try:
        result = (
            supabase
            .table("assignments")
            .delete()
            .eq("id", assignment_id)
            .eq("user_id", user_id)
            .execute()
        )
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
