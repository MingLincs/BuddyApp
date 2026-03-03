from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import PyPDF2
import io
import json
from datetime import datetime

from ..auth import user_id_from_auth_header
from ..supabase import supabase
from ..services.db import new_uuid
from ..services.llm import llm

router = APIRouter(prefix="/syllabus", tags=["syllabus"])


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")


async def parse_syllabus_with_openai(text: str) -> dict:
    """Use OpenAI to parse syllabus content"""
    
    prompt = f"""Parse this syllabus and extract structured information. Return ONLY valid JSON with no markdown formatting or backticks.

Syllabus text:
{text[:8000]}

Extract:
1. class_name (course title/name)
2. subject_area (e.g., "Computer Science", "Biology", etc.)
3. instructor (professor name if present)
4. description (brief course description)
5. assignments (list of objects with: title, due_date (YYYY-MM-DD format if date present, null otherwise), points, description)
6. grading_policy (grading breakdown if present)

Return JSON only, no other text. Example format:
{{
  "class_name": "Introduction to Psychology",
  "subject_area": "Psychology",
  "instructor": "Dr. Smith",
  "description": "Overview of psychological principles",
  "assignments": [
    {{"title": "Midterm Exam", "due_date": "2026-03-15", "points": 100, "description": "Covers chapters 1-5"}},
    {{"title": "Final Project", "due_date": "2026-05-20", "points": 200, "description": "Research paper"}}
  ],
  "grading_policy": "Exams 50%, Projects 30%, Participation 20%"
}}"""

    try:
        messages = [
            {"role": "system", "content": "You are a precise syllabus parser. Always return valid JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        response_text = await llm(messages, max_tokens=2000, temperature=0.1)
        
        # Remove markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        response_text = response_text.strip()
        
        return json.loads(response_text)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse syllabus: {str(e)}")


@router.post("/upload")
async def upload_syllabus(
    class_id: str,
    file: UploadFile = File(...),
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Upload and parse a syllabus PDF for a class"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    # Verify class ownership
    check = (
        supabase
        .table("classes")
        .select("id,name")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    
    if not check.data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Read file
    file_bytes = await file.read()
    
    # Extract text from PDF
    text = extract_text_from_pdf(file_bytes)
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from PDF. Make sure it's not a scanned image.")
    
    # Parse with OpenAI
    parsed_data = await parse_syllabus_with_openai(text)
    
    # Update class with syllabus data
    supabase.table("classes").update({
        "has_syllabus": True,
        "subject_area": parsed_data.get("subject_area"),
        "instructor": parsed_data.get("instructor"),
        "description": parsed_data.get("description"),
        "grading_policy": parsed_data.get("grading_policy"),
    }).eq("id", class_id).execute()
    
    # Create assignments if they exist
    assignments = parsed_data.get("assignments", [])
    assignments_created = 0
    
    if assignments:
        for assignment in assignments:
            try:
                # Convert date string to proper format
                due_date = assignment.get("due_date")
                if due_date:
                    try:
                        # Parse and validate date
                        date_obj = datetime.strptime(due_date, "%Y-%m-%d")
                        due_date_str = date_obj.isoformat()
                    except:
                        due_date_str = None
                else:
                    due_date_str = None
                
                supabase.table("assignments").insert({
                    "id": new_uuid(),
                    "class_id": class_id,
                    "user_id": user_id,
                    "title": assignment.get("title", "Untitled Assignment"),
                    "description": assignment.get("description"),
                    "due_date": due_date_str,
                    "points": assignment.get("points"),
                    "completed": False,
                    "source": "syllabus_upload"
                }).execute()
                
                assignments_created += 1
                
            except Exception as e:
                # Skip this assignment if creation fails
                print(f"Failed to create assignment: {e}")
                continue
    
    return {
        "success": True,
        "parsed_data": parsed_data,
        "assignments_created": assignments_created
    }


@router.get("/preview/{class_id}")
def get_syllabus_data(
    class_id: str,
    user_id: Optional[str] = Depends(user_id_from_auth_header)
):
    """Get parsed syllabus data for a class"""
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Login required")
    
    result = (
        supabase
        .table("classes")
        .select("id,name,subject_area,instructor,description,grading_policy,has_syllabus")
        .eq("id", class_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    return result.data
