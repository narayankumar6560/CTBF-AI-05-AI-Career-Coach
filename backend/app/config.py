
import os
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

def validate_ai_config():

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing")

    if not GEMINI_MODEL:
        raise ValueError("GEMINI_MODEL is missing")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")