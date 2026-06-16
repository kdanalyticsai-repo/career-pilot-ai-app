import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.job import Job, SavedSearch
from app.models.user import User
from app.schemas.job import (
    JobResponse, JobListResponse, JobFilter,
    SavedSearchCreate, SavedSearchResponse, SavedSearchListResponse,
)
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_matches_saved_search(job: Job, search: SavedSearch) -> bool:
    if search.location and search.location.lower() not in job.location.lower():
        return False
    if search.job_type and search.job_type != job.job_type:
        return False
    if search.experience_level and search.experience_level != job.experience_level:
        return False
    if search.remote_type and search.remote_type != job.remote_type:
        return False
    if search.skills:
        skill_q = search.skills.lower()
        if not any(skill_q in s.lower() for s in job.skills_required):
            return False
    if search.min_salary:
        disclosed = job.salary_max or job.salary_min
        if not disclosed or disclosed < search.min_salary:
            return False
    if search.q:
        q = search.q.lower()
        if q not in job.title.lower() and q not in job.company.lower() and q not in job.description.lower():
            return False
    return True


@router.get("", response_model=JobListResponse)
async def list_jobs(
    q: str | None = Query(None),
    location: str | None = Query(None),
    skills: str | None = Query(None),
    job_type: str | None = Query(None),
    experience_level: str | None = Query(None),
    remote_type: str | None = Query(None),
    min_match_score: int | None = Query(None),
    saved_only: bool = Query(False),
    min_salary: int | None = Query(None),
    posted_within_days: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = JobFilter(
        q=q,
        location=location,
        skills=skills,
        job_type=job_type,
        experience_level=experience_level,
        remote_type=remote_type,
        min_match_score=min_match_score,
        saved_only=saved_only,
        min_salary=min_salary,
        posted_within_days=posted_within_days,
    )
    svc = JobService(db)
    jobs = await svc.list_jobs(current_user.id, filters)
    return JobListResponse(jobs=jobs, total=len(jobs))


@router.post("/saved-searches", response_model=SavedSearchResponse, status_code=201)
async def create_saved_search(
    data: SavedSearchCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    saved_search = SavedSearch(user_id=current_user.id, **data.model_dump())
    db.add(saved_search)
    await db.commit()
    await db.refresh(saved_search)
    return saved_search


@router.get("/saved-searches", response_model=SavedSearchListResponse)
async def list_saved_searches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(SavedSearch.user_id == current_user.id).order_by(SavedSearch.created_at.desc())
    )
    return SavedSearchListResponse(saved_searches=result.scalars().all())


@router.delete("/saved-searches/{saved_search_id}", status_code=204)
async def delete_saved_search(
    saved_search_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedSearch).where(SavedSearch.id == saved_search_id, SavedSearch.user_id == current_user.id)
    )
    saved_search = result.scalar_one_or_none()
    if not saved_search:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved search not found")
    await db.delete(saved_search)
    await db.commit()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await JobService(db).get_job(job_id, current_user.id)


@router.post("/{job_id}/save", status_code=204)
async def save_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await JobService(db).save_job(job_id, current_user.id)


@router.delete("/{job_id}/save", status_code=204)
async def unsave_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await JobService(db).unsave_job(job_id, current_user.id)


@router.post("/compute-matches", response_model=dict)
async def compute_matches(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await JobService(db).compute_all_matches(current_user.id)
    return {"matched": count}


@router.post("/seed", response_model=dict)
async def seed_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await JobService(db).seed_jobs()
    return {"seeded": count}


@router.post("/sync-adzuna", response_model=dict)
async def sync_from_adzuna(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.adzuna_service import AdzunaService
    count = await AdzunaService().sync_jobs_to_db(db)
    return {"synced": count, "source": "adzuna"}


@router.post("/sync-remotive", response_model=dict)
async def sync_from_remotive(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.remotive_service import RemotiveService
    count = await RemotiveService().sync_jobs_to_db(db)
    return {"synced": count, "source": "remotive"}


@router.post("/sync-jobicy", response_model=dict)
async def sync_from_jobicy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.jobicy_service import JobicyService
    count = await JobicyService().sync_jobs_to_db(db)
    return {"synced": count, "source": "jobicy"}


@router.post("/sync-careerjet", response_model=dict)
async def sync_from_careerjet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.careerjet_service import CareerjetService
    count = await CareerjetService().sync_jobs_to_db(db)
    return {"synced": count, "source": "careerjet"}


@router.post("/sync-arbeitnow", response_model=dict)
async def sync_from_arbeitnow(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.arbeitnow_service import ArbeitnowService
    count = await ArbeitnowService().sync_jobs_to_db(db)
    return {"synced": count, "source": "arbeitnow"}


@router.post("/sync-himalayas", response_model=dict)
async def sync_from_himalayas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.himalayas_service import HimalayasService
    count = await HimalayasService().sync_jobs_to_db(db)
    return {"synced": count, "source": "himalayas"}


@router.post("/sync-jsearch", response_model=dict)
async def sync_from_jsearch(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.jsearch_service import JSearchService
    count = await JSearchService().sync_jobs_to_db(db)
    return {"synced": count, "source": "jsearch"}


@router.post("/sync-serpapi", response_model=dict)
async def sync_from_serpapi(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.serpapi_service import SerpApiService
    count = await SerpApiService().sync_jobs_to_db(db)
    return {"synced": count, "source": "serpapi"}


@router.post("/sync-jooble", response_model=dict)
async def sync_from_jooble(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.jooble_service import JoobleService
    count = await JoobleService().sync_jobs_to_db(db)
    return {"synced": count, "source": "jooble"}


@router.post("/sync-themuse", response_model=dict)
async def sync_from_themuse(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.themuse_service import TheMuseService
    count = await TheMuseService().sync_jobs_to_db(db)
    return {"synced": count, "source": "themuse"}


@router.post("/sync-all", response_model=dict)
async def sync_all_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import asyncio
    from datetime import datetime, timezone
    from sqlalchemy import func as sqlfunc
    from app.database import AsyncSessionLocal
    from app.models.job import Job as JobModel
    from app.services.adzuna_service import AdzunaService
    from app.services.remotive_service import RemotiveService
    from app.services.jobicy_service import JobicyService
    from app.services.serpapi_service import SerpApiService
    from app.services.jooble_service import JoobleService
    from app.services.themuse_service import TheMuseService
    from app.services.careerjet_service import CareerjetService
    from app.services.arbeitnow_service import ArbeitnowService
    from app.services.himalayas_service import HimalayasService
    from app.services.jsearch_service import JSearchService
    from app.services.notification_service import get_user_push_tokens, send_push_notifications

    sync_start = datetime.now(timezone.utc)

    # Each service gets its own session — safe for concurrent execution
    async def run(service_cls):
        try:
            async with AsyncSessionLocal() as session:
                return await service_cls().sync_jobs_to_db(session)
        except Exception:
            return 0

    results = await asyncio.gather(
        run(AdzunaService),
        run(RemotiveService),
        run(JobicyService),
        run(SerpApiService),
        run(JoobleService),
        run(TheMuseService),
        run(CareerjetService),
        run(ArbeitnowService),
        run(HimalayasService),
        run(JSearchService),
        return_exceptions=True,
    )
    adzuna, remotive, jobicy, serpapi, jooble, themuse, careerjet, arbeitnow, himalayas, jsearch = [
        r if isinstance(r, int) else 0 for r in results
    ]
    total = adzuna + remotive + jobicy + serpapi + jooble + themuse + careerjet + arbeitnow + himalayas + jsearch

    total_in_db_result = await db.execute(
        sqlfunc.count(JobModel.id).select().where(JobModel.is_active == True)
    )
    total_in_db = total_in_db_result.scalar() or 0

    if total > 0:
        tokens = await get_user_push_tokens(db, current_user.id)
        if tokens:
            await send_push_notifications(
                tokens,
                title="New Jobs Available",
                body=f"{total} new job{'s' if total != 1 else ''} added. {total_in_db} live jobs available!",
                data={"type": "new_jobs", "count": total},
            )

        # Saved search alerts — notify users whose saved searches match any newly added job
        new_jobs_result = await db.execute(
            select(JobModel).where(JobModel.created_at >= sync_start, JobModel.is_active == True)
        )
        new_jobs = new_jobs_result.scalars().all()
        if new_jobs:
            searches_result = await db.execute(select(SavedSearch))
            searches = searches_result.scalars().all()
            for search in searches:
                matches = [j for j in new_jobs if _job_matches_saved_search(j, search)]
                if not matches:
                    continue
                search_tokens = await get_user_push_tokens(db, search.user_id)
                if not search_tokens:
                    continue
                lead = matches[0]
                extra = f" and {len(matches) - 1} more" if len(matches) > 1 else ""
                await send_push_notifications(
                    search_tokens,
                    title=f"New match: {search.name}",
                    body=f"{lead.title} at {lead.company}{extra}",
                    data={"type": "saved_search_match", "saved_search_id": str(search.id)},
                )

    return {
        "synced": total,
        "total_in_db": total_in_db,
        "breakdown": {
            "adzuna": adzuna,
            "remotive": remotive,
            "jobicy": jobicy,
            "serpapi": serpapi,
            "jooble": jooble,
            "themuse": themuse,
            "careerjet": careerjet,
            "arbeitnow": arbeitnow,
            "himalayas": himalayas,
            "jsearch": jsearch,
        },
    }
