
import fitz
from docx import Document
from io import BytesIO


def extract_resume_text(file_bytes, filename):

    filename = filename.lower()

    # PDF extraction
    if filename.endswith(".pdf"):

        pdf = fitz.open(
            stream=file_bytes,
            filetype="pdf"
        )

        text = ""

        for page in pdf:
            text += page.get_text() + "\n"

        pdf.close()

    # DOCX extraction
    elif filename.endswith(".docx"):

        document = Document(BytesIO(file_bytes))

        text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
        )

    else:
        raise ValueError("Only PDF and DOCX files are supported")

    if not text.strip():
        raise ValueError(
            "No readable text found in resume. "
            "Scanned PDFs are not supported yet."
        )

    return text.strip()
