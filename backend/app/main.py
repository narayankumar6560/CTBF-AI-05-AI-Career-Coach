from app.routes.roadmap import router as roadmap_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.courses import router as courses_router
from app.database import engine, Base
from app import models
from app.routes.interview import router as interview_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Career Coach",
    description="Resume Job Matching and Skill Gap Coach",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
def home():
    return {
        "message": "Welcome to AI Career Coach",
        "status": "running"
    }


@app.get("/api/v1/health")
def health():
    return {
        "status": "healthy",
        "service": "AI Career Coach"
    }


# Resume analysis routes
from app.routes.analysis import router as analysis_router

app.include_router(
    analysis_router,
    prefix="/api/v1/analyze",
    tags=["Resume Analysis"]
)
app.include_router(
    roadmap_router,
    prefix="/api/v1/roadmap",
    tags=["Learning Roadmap"]
)
app.include_router(
    courses_router,
    prefix="/api/v1/courses",
    tags=["Course Recommendations"]
)
app.include_router(
    interview_router,
    prefix="/api/v1/interview",
    tags=["AI Mock Interview"]
)