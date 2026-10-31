
import json
import traceback

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Form,
    Depends
)
from sqlalchemy.orm import Session

from app.services.resume_parser import extract_resume_text

from app.services.ai_service import (
    extract_resume_details,
    extract_job_skills,
    generate_skill_gap_analysis,
    analyze_resume_credibility
)

from app.database import get_db
from app import models


router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# --------------------------------------------------
# 1. PARSE RESUME
# --------------------------------------------------

@router.post("/resume/parse")
async def parse_resume(
    resume: UploadFile = File(...)
):

    filename = resume.filename or ""

    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported"
        )

    file_bytes = await resume.read(MAX_FILE_SIZE + 1)

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size must be below 5 MB"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    try:
        extracted_text = extract_resume_text(
            file_bytes,
            filename
        )

        return {
            "success": True,
            "filename": filename,
            "characters_extracted": len(extracted_text),
            "resume_text": extracted_text
        }

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        print("RESUME PARSE ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to process resume"
        )


# --------------------------------------------------
# 2. AI RESUME ANALYSIS
# --------------------------------------------------

@router.post("/resume/analyze")
async def analyze_resume(
    resume: UploadFile = File(...)
):

    filename = resume.filename or ""

    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported"
        )

    file_bytes = await resume.read(MAX_FILE_SIZE + 1)

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 5 MB"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    try:
        resume_text = extract_resume_text(
            file_bytes,
            filename
        )

        print("STEP 1: Resume extracted", flush=True)

        result = extract_resume_details(resume_text)

        print("STEP 2: Resume analysis completed", flush=True)

        return {
            "success": True,
            "filename": filename,
            "analysis": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        print("RESUME ANALYSIS ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=502,
            detail="AI resume analysis failed. Check backend terminal."
        )


# --------------------------------------------------
# 3. RESUME AND JOB DESCRIPTION MATCHING
# --------------------------------------------------

@router.post("/match")
async def match_resume_with_job(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
    db: Session = Depends(get_db)
):

    filename = resume.filename or ""

    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported"
        )

    file_bytes = await resume.read(MAX_FILE_SIZE + 1)

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size must be below 5 MB"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    if not job_description.strip():
        raise HTTPException(
            status_code=400,
            detail="Job description required"
        )

    try:

        # STEP 1: Extract resume text
        resume_text = extract_resume_text(
            file_bytes,
            filename
        )

        print("STEP 1: Resume extracted", flush=True)

        # STEP 2: Analyze resume using Groq AI
        resume_data = extract_resume_details(resume_text)

        print("STEP 2: Resume analysis completed", flush=True)

        # STEP 3: Extract required skills from job description
        print("STEP 3: Extracting job skills", flush=True)

        required_skills = extract_job_skills(job_description)

        print("STEP 4: Job skills extracted", flush=True)

        # STEP 4: Collect candidate skills
        candidate_skills = []

        for key in [
            "technical_skills",
            "programming_languages",
            "frameworks",
            "databases",
            "tools"
        ]:
            candidate_skills.extend(
                resume_data.get(key, [])
            )

        # STEP 5: Normalize skills
        normalize = lambda skill: skill.strip().lower()

        candidate_map = {
            normalize(skill): skill
            for skill in candidate_skills
            if isinstance(skill, str)
        }

        # STEP 6: Find matched skills
        matched = [
            skill for skill in required_skills
            if normalize(skill) in candidate_map
        ]

        # STEP 7: Find missing skills
        missing = [
            skill for skill in required_skills
            if normalize(skill) not in candidate_map
        ]

        # STEP 8: Calculate match score
        score = round(
            len(matched) / len(required_skills) * 100
        ) if required_skills else 0

        print("STEP 5: Skill matching completed", flush=True)

        # STEP 9: Generate AI skill-gap analysis
        print("STEP 6: Generating skill-gap analysis", flush=True)

        gap_analysis = generate_skill_gap_analysis(
            missing,
            job_description
        )

        print("STEP 7: Skill-gap analysis completed", flush=True)

        # STEP 10: Save resume in MySQL
        new_resume = models.Resume(
            filename=filename,
            resume_text=resume_text
        )

        db.add(new_resume)
        db.flush()

        # STEP 11: Save job description
        new_job = models.JobDescription(
            job_title="Not specified",
            description=job_description
        )

        db.add(new_job)
        db.flush()

        # STEP 12: Save analysis results
        new_analysis = models.Analysis(
            resume_id=new_resume.id,
            job_id=new_job.id,
            match_score=score,
            matched_skills=json.dumps(matched),
            missing_skills=json.dumps(missing),
            gap_analysis=json.dumps(gap_analysis)
        )

        db.add(new_analysis)

        # Permanently save all records
        db.commit()

        print("STEP 8: Results saved in MySQL", flush=True)

        # STEP 13: Return complete response
        return {
            "success": True,
            "database_saved": True,
            "analysis_id": new_analysis.id,
            "match_score": score,
            "matched_skills": matched,
            "missing_skills": missing,
            "required_skills": required_skills,
            "gap_analysis": gap_analysis,
            "resume_analysis": resume_data
        }

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        db.rollback()

        traceback.print_exc()

        print(
            "MATCHING ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=502,
            detail="Resume matching or database saving failed. Check backend terminal."
        )

    finally:
        await resume.close()

# --------------------------------------------------
# 4. RESUME CREDIBILITY ANALYZER
# --------------------------------------------------

@router.post("/resume/credibility")
async def check_resume_credibility(
    resume: UploadFile = File(...)
):
    filename = resume.filename or ""

    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported"
        )

    file_bytes = await resume.read(MAX_FILE_SIZE + 1)

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Resume must be below 5 MB"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    try:
        resume_text = extract_resume_text(file_bytes, filename)

        if not resume_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No readable text found in the resume"
            )

        report = analyze_resume_credibility(resume_text)

        return {
            "success": True,
            "filename": filename,
            "report": report
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )

    except Exception as error:
        print(
            "CREDIBILITY ANALYSIS ERROR:",
            repr(error),
            flush=True
        )

        raise HTTPException(
            status_code=502,
            detail="Resume credibility analysis failed. Check backend terminal."
        )

    finally:
        await resume.close()
