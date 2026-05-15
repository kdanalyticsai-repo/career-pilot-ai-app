import json
from app.ai.claude_client import get_client
from app.config import settings

COVER_LETTER_SYSTEM = """You are an expert career coach and professional writer who crafts compelling,
authentic cover letters. Return only valid JSON with no markdown fences."""

COVER_LETTER_PROMPT = """Write a professional cover letter for this candidate applying to this job.

Rules:
- 3-4 paragraphs, around 250-300 words total
- Opening: hook that shows genuine interest in the specific company
- Middle: 2-3 specific achievements from their experience matching job requirements
- Closing: confident call to action
- Tone: professional but human — avoid generic phrases like "I am writing to express my interest"

Return JSON with EXACTLY these keys:
{{
  "subject_line": str,
  "cover_letter": str,
  "key_highlights": [str]
}}

Job Title: {job_title}
Company: {job_company}
Company Description (from job): {job_description_short}
Required Skills: {job_skills}

Candidate Name: {candidate_name}
Candidate Skills: {candidate_skills}
Recent Experience: {recent_experience}
Summary: {candidate_summary}"""

MOCK_COVER_LETTER = {
    "subject_line": "Application for Software Engineer Role",
    "cover_letter": """Dear Hiring Team,

What drew me to this opportunity is the chance to build systems that operate at true scale — and from everything I've read about your engineering culture, you approach that challenge with the same rigour I've developed over the past three years.

In my most recent role, I reduced our core API's p95 latency by 40% by redesigning the database access layer to use connection pooling and query batching — work that directly improved user experience for over 200,000 daily active users. I also led the migration of our monolithic codebase to a microservices architecture, cutting deployment time from 45 minutes to under 5.

What I bring beyond technical skills is the habit of treating every system as if it's already at ten times the current scale — because it usually needs to be. I'd love to bring that mindset to your team.

I'm genuinely excited about this role and would welcome the chance to learn more. Thank you for your time.

Warm regards""",
    "key_highlights": [
        "Reduced API latency by 40% through connection pooling redesign",
        "Led monolith-to-microservices migration cutting deploy time by 90%",
        "Scale-first engineering mindset applicable to the role",
    ],
}


def generate_cover_letter(job_title: str, job_company: str, job_description: str, job_skills: list[str],
                           candidate_name: str, candidate_skills: list[str],
                           recent_experience: list[dict], candidate_summary: str) -> dict:
    if not settings.has_anthropic_key:
        mock = dict(MOCK_COVER_LETTER)
        mock["subject_line"] = f"Application for {job_title} — {candidate_name}"
        return mock

    exp_summary = []
    for exp in recent_experience[:2]:
        title = exp.get("title", "")
        company = exp.get("company", "")
        bullets = exp.get("bullets", [])[:2]
        exp_summary.append(f"{title} at {company}: " + "; ".join(bullets))

    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=1500,
        messages=[
            {"role": "system", "content": COVER_LETTER_SYSTEM},
            {"role": "user", "content": COVER_LETTER_PROMPT.format(
                job_title=job_title,
                job_company=job_company,
                job_description_short=job_description[:300],
                job_skills=", ".join(job_skills[:12]),
                candidate_name=candidate_name,
                candidate_skills=", ".join(candidate_skills[:15]),
                recent_experience="\n".join(exp_summary) or "Not provided",
                candidate_summary=candidate_summary[:300] or "Not provided",
            )},
        ],
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
