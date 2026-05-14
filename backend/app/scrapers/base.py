from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ScrapedJob:
    external_id: str
    source: str
    title: str
    company: str
    location: str | None
    job_type: str | None
    description: str
    requirements: str | None
    skills_required: list[str]
    apply_url: str
    posted_at: datetime | None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str = "INR"


class BaseScraper(ABC):
    source: str = ""

    @abstractmethod
    def scrape(self, query: str, location: str = "", limit: int = 50) -> list[ScrapedJob]:
        """Scrape jobs and return a list of ScrapedJob objects."""
        ...
