import logging
from app.ai.claude_client import get_client
from app.config import settings

logger = logging.getLogger(__name__)

CAREER_COACH_SYSTEM = """You are ProAICV's AI career coach — an expert career advisor with deep knowledge
of the Indian tech job market, resume writing, interview preparation, salary negotiation, and career growth.

You help users:
- Improve their resume and ATS scores
- Prepare for technical and behavioral interviews
- Navigate job searching and application strategy
- Understand salary expectations and how to negotiate
- Plan career transitions and skill development

Keep responses concise (under 150 words). Be specific, actionable and encouraging.
Reference the user's actual context when provided."""


def chat_with_coach(messages: list[dict], user_context: str | None = None) -> str:
    if not settings.has_anthropic_key:
        return "AI coach is not configured. Please contact support."

    system = CAREER_COACH_SYSTEM
    if user_context:
        system += f"\n\nUser context:\n{user_context}"

    try:
        client = get_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=350,
            temperature=0.7,
            timeout=10,
            messages=[{"role": "system", "content": system}] + messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Career coach API error: {e}")
        return "I'm having trouble connecting right now. Please try again in a moment."
