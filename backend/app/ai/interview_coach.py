import json
from app.ai.claude_client import get_client
from app.config import settings

INTERVIEW_SYSTEM = """You are a senior hiring manager and interview coach with 15 years of experience.
Generate realistic, specific interview preparation for the given job and candidate profile.
Return only valid JSON with no markdown fences."""

INTERVIEW_PROMPT = """Generate interview preparation for this candidate applying to this job.

Return JSON with EXACTLY these keys:
{{
  "behavioral_questions": [
    {{"question": str, "why_asked": str, "sample_answer_framework": str}}
  ],
  "technical_questions": [
    {{"question": str, "topic": str, "difficulty": "easy|medium|hard"}}
  ],
  "questions_to_ask": [str],
  "prep_tips": [str],
  "role_research_points": [str]
}}

Limits: 5 behavioral, 5 technical, 4 questions to ask, 4 prep tips, 3 research points.

Job Title: {job_title}
Company: {job_company}
Required Skills: {job_skills}
Experience Level: {experience_level}
Job Description (first 500 chars): {job_description}

Candidate Skills: {candidate_skills}
Candidate Experience Titles: {candidate_titles}"""

MOCK_PREP = {
    "behavioral_questions": [
        {"question": "Tell me about a time you had to debug a critical production issue under pressure.", "why_asked": "Tests problem-solving, communication and ownership under pressure.", "sample_answer_framework": "Use STAR: Describe the system impact, your diagnostic steps, root cause found, fix deployed and monitoring added."},
        {"question": "Describe a situation where you disagreed with a technical decision. How did you handle it?", "why_asked": "Assesses collaboration, communication and professional maturity.", "sample_answer_framework": "Show you raised concerns with data, listened to counterpoints and either changed your mind or found a compromise."},
        {"question": "Tell me about the most complex system you've designed or built.", "why_asked": "Evaluates technical depth, design thinking and impact.", "sample_answer_framework": "Cover the problem, constraints, your design choices, trade-offs considered and the outcome."},
        {"question": "How have you handled a situation where requirements changed mid-sprint?", "why_asked": "Tests adaptability and communication with stakeholders.", "sample_answer_framework": "Explain how you evaluated impact, re-prioritised, communicated to the team and delivered."},
        {"question": "Give an example of when you improved a process or system proactively.", "why_asked": "Tests ownership and initiative beyond assigned work.", "sample_answer_framework": "Show you identified the gap, built consensus, implemented the change and measured the improvement."},
    ],
    "technical_questions": [
        {"question": "How would you design a rate limiter for a high-traffic API?", "topic": "System Design", "difficulty": "medium"},
        {"question": "Explain the difference between optimistic and pessimistic locking. When would you use each?", "topic": "Databases", "difficulty": "medium"},
        {"question": "How does async/await work under the hood in Python?", "topic": "Python", "difficulty": "medium"},
        {"question": "Walk me through how you'd diagnose a slow database query.", "topic": "Performance", "difficulty": "easy"},
        {"question": "How would you design a job queue that guarantees at-least-once delivery?", "topic": "Distributed Systems", "difficulty": "hard"},
    ],
    "questions_to_ask": [
        "What does the on-call rotation look like for this team?",
        "What are the biggest technical challenges the team is facing in the next 6 months?",
        "How does the team approach technical debt vs feature delivery?",
        "What does career growth typically look like for engineers in this role?",
    ],
    "prep_tips": [
        "Research the company's engineering blog and recent tech stack announcements before the interview.",
        "Prepare 2-3 concrete examples with metrics for your strongest projects — numbers make answers memorable.",
        "Practice system design on a whiteboard or paper — draw data flow diagrams out loud.",
        "Review your own resume carefully — be ready to dive deep on any line item.",
    ],
    "role_research_points": [
        "Check LinkedIn for current engineers in this role to understand the team composition.",
        "Review recent news about the company — funding rounds, product launches, and tech blog posts.",
        "Understand their core business model and how engineering directly supports revenue.",
    ],
}


def generate_interview_prep(job_title: str, job_company: str, job_skills: list[str], experience_level: str,
                             job_description: str, candidate_skills: list[str], candidate_titles: list[str]) -> dict:
    if not settings.has_anthropic_key:
        return MOCK_PREP

    client = get_client()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        system=INTERVIEW_SYSTEM,
        messages=[{
            "role": "user",
            "content": INTERVIEW_PROMPT.format(
                job_title=job_title,
                job_company=job_company,
                job_skills=", ".join(job_skills[:15]),
                experience_level=experience_level,
                job_description=job_description[:500],
                candidate_skills=", ".join(candidate_skills[:20]),
                candidate_titles=", ".join(candidate_titles[:5]),
            ),
        }],
    )
    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
