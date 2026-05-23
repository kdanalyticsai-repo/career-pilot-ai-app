from openai import OpenAI
from app.config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=25.0)
    return _client
