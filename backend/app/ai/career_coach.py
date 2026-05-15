from app.ai.claude_client import get_client
from app.config import settings

CAREER_COACH_SYSTEM = """You are CVPilot's AI career coach — an expert career advisor with deep knowledge
of the Indian tech job market, resume writing, interview preparation, salary negotiation, and career growth.

You help users:
- Improve their resume and ATS scores
- Prepare for technical and behavioral interviews
- Navigate job searching and application strategy
- Understand salary expectations and how to negotiate
- Plan career transitions and skill development

Keep responses concise (under 200 words unless the user explicitly asks for more detail).
Be specific, actionable and encouraging. Reference the user's actual context when provided."""


def chat_with_coach(messages: list[dict], user_context: str | None = None) -> str:
    if not settings.has_anthropic_key:
        last_msg = messages[-1]["content"] if messages else ""
        if "salary" in last_msg.lower():
            return "For mid-level backend engineers in Bangalore, the typical range is ₹18–35 LPA depending on company tier. FAANG/unicorns pay ₹40–80 LPA+. Always negotiate — most companies have a 10–20% flex above the initial offer. Lead with market data, not personal need."
        if "interview" in last_msg.lower():
            return "The most common failure in tech interviews isn't the hard problems — it's communicating your thought process on easy ones. Practice thinking out loud. For system design, always clarify scope before designing. For behaviorals, prepare 5 strong STAR stories you can adapt to any question."
        if "resume" in last_msg.lower():
            return "The single highest-impact resume fix is quantifying your bullets. 'Improved API performance' becomes 'Reduced p95 API latency by 40% (250ms → 150ms) serving 500K daily requests.' Every bullet should answer: how much, how many, or how fast."
        return "I'm your CVPilot AI coach! I can help you with resume improvements, interview prep, salary negotiation, job search strategy, and career planning. What would you like to work on today?"

    system = CAREER_COACH_SYSTEM
    if user_context:
        system += f"\n\nUser context:\n{user_context}"

    try:
        client = get_client()
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            system=system,
            messages=messages,
        )
        return message.content[0].text
    except Exception:
        # API unavailable or out of credits — return a helpful mock reply
        last_msg = messages[-1]["content"] if messages else ""
        if "salary" in last_msg.lower():
            return "For mid-level backend engineers in Bangalore, the typical range is ₹18–35 LPA depending on company tier. FAANG/unicorns pay ₹40–80 LPA+. Always negotiate — most companies have a 10–20% flex above the initial offer. Lead with market data, not personal need."
        if "interview" in last_msg.lower():
            return "The most common failure in tech interviews isn't the hard problems — it's communicating your thought process on easy ones. Practice thinking out loud. For system design, always clarify scope before designing. For behaviorals, prepare 5 strong STAR stories you can adapt to any question."
        if "resume" in last_msg.lower():
            return "The single highest-impact resume fix is quantifying your bullets. 'Improved API performance' becomes 'Reduced p95 API latency by 40% (250ms → 150ms) serving 500K daily requests.' Every bullet should answer: how much, how many, or how fast."
        return "I'm your CVPilot AI coach! I can help you with resume improvements, interview prep, salary negotiation, job search strategy, and career planning. What would you like to work on today?"
