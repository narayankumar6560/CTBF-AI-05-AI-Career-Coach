
import json
import traceback

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

from app.services.ai_service import (
    generate_interview_questions,
    evaluate_interview_answer
)

router = APIRouter()


# --------------------------------------------------
# 1. START MOCK INTERVIEW
# --------------------------------------------------

@router.post("/start")
def start_interview(
    analysis_id: int,
    db: Session = Depends(get_db)
):
    try:
        # Find previous resume analysis
        analysis = db.query(models.Analysis).filter(
            models.Analysis.id == analysis_id
        ).first()

        if not analysis:
            raise HTTPException(
                status_code=404,
                detail="Analysis not found"
            )

        # Find job description
        job = db.query(models.JobDescription).filter(
            models.JobDescription.id == analysis.job_id
        ).first()

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job description not found"
            )

        # Generate 5 interview questions
        result = generate_interview_questions(
            job.description
        )

        questions = result.get("questions", [])

        if not questions:
            raise HTTPException(
                status_code=502,
                detail="AI did not generate interview questions"
            )

        # Create interview session
        new_session = models.InterviewSession(
            job_title=job.job_title
        )

        db.add(new_session)
        db.flush()

        # Save questions as interview answer records
        for item in questions:
            answer_record = models.InterviewAnswer(
                session_id=new_session.id,
                question=item.get("question", ""),
                answer="",
                feedback="",
                score=0
            )

            db.add(answer_record)

        db.commit()
        db.refresh(new_session)

        saved_questions = db.query(
            models.InterviewAnswer
        ).filter(
            models.InterviewAnswer.session_id == new_session.id
        ).order_by(
            models.InterviewAnswer.id
        ).all()

        return {
            "success": True,
            "session_id": new_session.id,
            "questions": [
                {
                    "question_id": q.id,
                    "question": q.question,
                    "difficulty": (
                        questions[i].get("difficulty", "Medium")
                        if i < len(questions) else "Medium"
                    ),
                    "topic": (
                        questions[i].get("topic", "")
                        if i < len(questions) else ""
                    )
                }
                for i, q in enumerate(saved_questions)
            ]
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        traceback.print_exc()

        print("INTERVIEW START ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to start mock interview"
        )


# --------------------------------------------------
# 2. SUBMIT AND EVALUATE ANSWER
# --------------------------------------------------

@router.post("/answer")
def submit_answer(
    session_id: int,
    question_id: int,
    answer: str,
    db: Session = Depends(get_db)
):
    try:
        # Validate answer
        if not answer.strip():
            raise HTTPException(
                status_code=400,
                detail="Answer cannot be empty"
            )

        # Find interview answer record
        record = db.query(models.InterviewAnswer).filter(
            models.InterviewAnswer.id == question_id,
            models.InterviewAnswer.session_id == session_id
        ).first()

        if not record:
            raise HTTPException(
                status_code=404,
                detail="Interview question not found"
            )

        # Evaluate answer using AI
        evaluation = evaluate_interview_answer(
            record.question,
            answer
        )

        # Update database
        record.answer = answer
        record.feedback = json.dumps(evaluation)
        record.score = float(evaluation.get("score", 0))

        db.commit()
        db.refresh(record)

        return {
            "success": True,
            "question_id": record.id,
            "answer": answer,
            "evaluation": evaluation
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        traceback.print_exc()

        print("INTERVIEW ANSWER ERROR:", repr(error), flush=True)

        raise HTTPException(
            status_code=500,
            detail="Unable to evaluate interview answer"
        )


# --------------------------------------------------
# 3. GET INTERVIEW RESULTS
# --------------------------------------------------

@router.get("/{session_id}/results")
def get_interview_results(
    session_id: int,
    db: Session = Depends(get_db)
):
    session = db.query(models.InterviewSession).filter(
        models.InterviewSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found"
        )

    records = db.query(models.InterviewAnswer).filter(
        models.InterviewAnswer.session_id == session_id
    ).all()

    total_score = sum(
        record.score or 0 for record in records
    )

    answered_count = sum(
        1 for record in records if record.answer
    )

    average_score = (
        round(total_score / answered_count, 2)
        if answered_count else 0
    )

    return {
        "success": True,
        "session_id": session_id,
        "job_title": session.job_title,
        "total_questions": len(records),
        "answered_questions": answered_count,
        "average_score": average_score,
        "results": [
            {
                "question_id": record.id,
                "question": record.question,
                "answer": record.answer,
                "feedback": (
                    json.loads(record.feedback)
                    if record.feedback else None
                ),
                "score": record.score
            }
            for record in records
        ]
    }
