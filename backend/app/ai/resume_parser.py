import json
import io
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams

from app.ai.claude_client import get_client

PARSE_SYSTEM_PROMPT = """You are an expert resume parser. Extract structured data from resume text.
Return ONLY valid JSON — no markdown fences, no extra text."""

PARSE_USER_PROMPT = """Parse this resume and return JSON matching this exact schema:

{{
  "contact": {{
    "name": "string",
    "email": "string or null",
    "phone": "string or null",
    "linkedin": "string or null",
    "github": "string or null",
    "location": "string or null"
  }},
  "summary": "string or null",
  "experience": [
    {{
      "company": "string",
      "title": "string",
      "location": "string or null",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "is_current": false,
      "bullets": ["string"],
      "technologies": ["string"]
    }}
  ],
  "education": [
    {{
      "institution": "string",
      "degree": "string",
      "field": "string or null",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "gpa": "string or null"
    }}
  ],
  "skills": {{
    "technical": ["string"],
    "soft": ["string"],
    "languages": ["string"],
    "certifications": ["string"]
  }},
  "projects": [
    {{
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "url": "string or null"
    }}
  ]
}}

Resume text:
{resume_text}"""


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    output = io.StringIO()
    extract_text_to_fp(
        io.BytesIO(pdf_bytes),
        output,
        laparams=LAParams(),
        output_type="text",
        codec="utf-8",
    )
    return output.getvalue()


def parse_resume(raw_text: str) -> dict:
    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4.1-nano",
        max_tokens=4096,
        messages=[
            {"role": "system", "content": PARSE_SYSTEM_PROMPT},
            {"role": "user", "content": PARSE_USER_PROMPT.format(resume_text=raw_text[:15000])},
        ],
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
