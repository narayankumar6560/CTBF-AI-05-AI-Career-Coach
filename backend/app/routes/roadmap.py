
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.ai_service import generate_learning_roadmap

router = APIRouter()


@router.post("/")
def create_roadmap(
    analysis_id: int,
    duration_days: int = Query(default=30, ge=1, le=180),
    db: Session = Depends(get_db)
):
    try:
        # Find the previous analysis
        analysis = db.query(models.Analysis).filter(
            models.Analysis.id == analysis_id
        ).first()

        if not analysis:
            raise HTTPException(
                status_code=404,
                detail="Analysis not found"
            )

        # Get missing skills
        import json
        missing_skills = json.loads(
            analysis.missing_skills or "[]"
        )

        # Get job description
        job = db.query(models.JobDescription).filter(
            models.JobDescription.id == analysis.job_id
        ).first()

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job description not found"
            )

        # Generate AI roadmap
        roadmap = generate_learning_roadmap(
            missing_skills,
            job.description,
            duration_days
        )

        # Save roadmap in MySQL
        new_roadmap = models.LearningRoadmap(
            analysis_id=analysis_id,
            roadmap_data=json.dumps(roadmap)
        )

        db.add(new_roadmap)
        db.commit()
        db.refresh(new_roadmap)

        return {
            "success": True,
            "roadmap_id": new_roadmap.id,
            "analysis_id": analysis_id,
            "roadmap": roadmap
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print("ROADMAP ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to generate learning roadmap"
        )
