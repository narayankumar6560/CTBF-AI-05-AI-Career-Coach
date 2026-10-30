
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


# 1. Users table
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(150), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# 2. Resumes table
class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255))
    resume_text = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# 3. Job descriptions table
class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    job_title = Column(String(150))
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# 4. Resume analysis table
class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"))
    job_id = Column(Integer, ForeignKey("job_descriptions.id"))
    match_score = Column(Float)
    matched_skills = Column(Text)
    missing_skills = Column(Text)
    gap_analysis = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# 5. Learning roadmaps table
class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"))
    roadmap_data = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


# 6. Mock interview sessions table
class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    job_title = Column(String(150))
    created_at = Column(DateTime, server_default=func.now())


# 7. Mock interview answers table
class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id"))
    question = Column(Text)
    answer = Column(Text)
    feedback = Column(Text)
    score = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
