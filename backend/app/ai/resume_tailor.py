import json
from app.ai.claude_client import get_client
from app.config import settings

TAILOR_SYSTEM = """You are an expert resume writer. Rewrite resume sections to better match a specific job.
Rules: never fabricate experience; reorder/emphasize existing experience; incorporate missing keywords naturally;
strengthen bullets with metrics and action verbs; rewrite summary to align with the job title.
Return only valid JSON with no markdown fences."""

TAILOR_PROMPT = """Tailor this resume for the job below. Return a JSON object with EXACTLY these keys:

{{
  "tailored_sections": {{
    "summary": <rewritten summary string or null>,
    "experience": [<same structure as input, with improved bullets>],
    "skills": {{
      "technical": [<reordered/augmented list emphasizing job-relevant skills>],
      "soft": [<same>]
    }}
  }},
  "changes": {{
    "summary": <string explaining what changed and why, or null>,
    "experience": [<one string per job entry describing changes>],
    "skills": <string explaining what was reordered/added>
  }},
  "keywords_added": [<list of keywords naturally incorporated>]
}}

Job:
Title: {job_title}
Company: {job_company}
Required Skills: {job_skills}
Description (first 600 chars): {job_description}

Original Resume:
{resume_json}"""

MOCK_TAILOR = {
    "tailored_sections": {
        "summary": "Results-driven software engineer with 3+ years building scalable backend systems. Proven expertise in Python, FastAPI and distributed systems — directly aligned with the role requirements. Delivered production systems serving millions of users with 99.9% uptime.",
        "experience": [],
        "skills": {"technical": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "REST APIs"], "soft": ["Problem Solving", "Communication", "Team Collaboration"]},
    },
    "changes": {
        "summary": "Rewrote to directly mention FastAPI and distributed systems matching the job description.",
        "experience": ["Strengthened first bullet with quantified impact metric.", "Added CI/CD keyword to second bullet naturally."],
        "skills": "Reordered to put most job-relevant skills first; Python and FastAPI moved to top.",
    },
    "keywords_added": ["FastAPI", "distributed systems", "scalable"],
}


def tailor_resume(resume_data: dict, job_title: str, job_company: str, job_skills: list[str], job_description: str) -> dict:
    if not settings.has_anthropic_key:
        mock = dict(MOCK_TAILOR)
        # Preserve original experience if available
        if resume_data.get("experience"):
            mock["tailored_sections"]["experience"] = resume_data["experience"]
        return mock

    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4.1-nano",
        max_tokens=4096,
        messages=[
            {"role": "system", "content": TAILOR_SYSTEM},
            {"role": "user", "content": TAILOR_PROMPT.format(
                job_title=job_title,
                job_company=job_company,
                job_skills=", ".join(job_skills[:15]),
                job_description=job_description[:600],
                resume_json=json.dumps(resume_data, indent=2)[:3000],
            )},
        ],
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
