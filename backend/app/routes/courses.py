
import json
import traceback

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.ai_service import generate_course_recommendations

router = APIRouter()


@router.post("/")
def recommend_courses(
    analysis_id: int,
    db: Session = Depends(get_db)
):
    try:
        # 1. Find the previous resume analysis
        analysis = db.query(models.Analysis).filter(
            models.Analysis.id == analysis_id
        ).first()

        if not analysis:
            raise HTTPException(
                status_code=404,
                detail="Analysis not found"
            )

        # 2. Get missing skills and target job description
        missing_skills = json.loads(
            analysis.missing_skills or "[]"
        )

        job = db.query(models.JobDescription).filter(
            models.JobDescription.id == analysis.job_id
        ).first()

        if not job:
            raise HTTPException(status_code=404, detail="Job description not found")

        # 3. Generate industry-rated course recommendations
        recommendations = generate_course_recommendations(
            missing_skills,
            job.description
        )

        # 4. Save recommendations in MySQL
        # Store them in the existing learning_roadmaps table
        saved_data = {
            "type": "course_recommendations",
            "data": recommendations
        }

        new_record = models.LearningRoadmap(
            analysis_id=analysis_id,
            roadmap_data=json.dumps(saved_data)
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        # 5. Return recommendations
        return {
            "success": True,
            "recommendation_id": new_record.id,
            "analysis_id": analysis_id,
            "recommendations": recommendations
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        traceback.print_exc()

        print("COURSE RECOMMENDATION ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to generate course recommendations"
        )
