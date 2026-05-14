from celery import Celery
from app.config import settings

celery_app = Celery(
    "cvpilot",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.resume_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_routes={
        "app.workers.resume_tasks.*": {"queue": "resumes"},
    },
    task_soft_time_limit=120,
    task_time_limit=180,
    # In local dev without Redis, run tasks synchronously in the same process
    task_always_eager=settings.use_celery_eager,
    task_eager_propagates=True,
)
