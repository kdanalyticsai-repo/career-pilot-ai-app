import json
from app.ai.claude_client import get_client

ATS_SYSTEM_PROMPT = """You are an ATS (Applicant Tracking System) expert and career coach.
Score resumes objectively and return only valid JSON with no markdown fences."""

ATS_PROMPT = """Analyse this resume and return a single JSON object with exactly these keys:

{{
  "total_score": <int 0-100>,
  "completeness_score": <int 0-100, how complete/filled-out the resume is>,
  "breakdown": {{
    "keyword_match": <int 0-100>,
    "skills_coverage": <int 0-100>,
    "format_quality": <int 0-100>,
    "experience_relevance": <int 0-100>,
    "education_match": <int 0-100>
  }},
  "keywords_found": [<strings>],
  "keywords_missing": [<strings, up to 8>],
  "critical_issues": [<strings, up to 5 most important>],
  "quick_wins": [<strings, up to 6 actionable short improvements>],
  "suggestions": {{
    "summary": [<strings, 1-3 suggestions for the summary section>],
    "experience": [<strings, 1-3 suggestions for experience bullets>],
    "skills": [<strings, 1-2 suggestions for skills section>],
    "education": [<strings, 1-2 suggestions for education section>],
    "overall": [<strings, 1-3 general suggestions>]
  }}
}}

Resume (structured):
{resume_json}"""


def score_resume_ats(structured_resume: dict) -> dict:
    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4.1-nano",
        max_tokens=2048,
        messages=[
            {"role": "system", "content": ATS_SYSTEM_PROMPT},
            {"role": "user", "content": ATS_PROMPT.format(resume_json=json.dumps(structured_resume, indent=2))},
        ],
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
