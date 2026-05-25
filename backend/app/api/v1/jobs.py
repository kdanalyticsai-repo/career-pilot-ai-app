import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.job import JobResponse, JobListResponse, JobFilter
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
    )
    svc = JobService(db)
    jobs = await svc.list_jobs(current_user.id, filters)
    return JobListResponse(jobs=jobs, total=len(jobs))


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
    from app.services.notification_service import get_user_push_tokens, send_push_notifications

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
        return_exceptions=True,
    )
    adzuna, remotive, jobicy, serpapi, jooble, themuse, careerjet, arbeitnow, himalayas = [
        r if isinstance(r, int) else 0 for r in results
    ]
    total = adzuna + remotive + jobicy + serpapi + jooble + themuse + careerjet + arbeitnow + himalayas

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
        },
    }
