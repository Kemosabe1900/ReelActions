from contextlib import asynccontextmanager
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.api import videos, jobs, profile, chat, admin, push_tokens, admin_dashboard, webhooks, waitlist
from app.workers.scheduler import run_streak_reminder, run_weekly_recap
from app.services.alerting import alert
from app.limiter import limiter
from app.config import settings

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment=settings.environment,
    )


async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    ip = request.client.host if request.client else "unknown"
    alert(
        f"Rate limit hit: {request.method} {request.url.path} from {ip} — {exc.detail}",
        event_type="rate_limit",
        ip=ip,
    )
    return JSONResponse({"detail": f"Rate limit exceeded: {exc.detail}"}, status_code=429)


scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(run_streak_reminder, CronTrigger(hour=19, minute=0))
    scheduler.add_job(run_weekly_recap, CronTrigger(day_of_week="mon", hour=9, minute=0))
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="ReelActions API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://reelactions-waitlist.vercel.app"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def block_ips_middleware(request: Request, call_next):
    ip = request.client.host if request.client else None
    if ip:
        try:
            from app.database import get_db
            result = get_db().table("blocked_ips").select("ip").eq("ip", ip).limit(1).execute()
            if result.data:
                return JSONResponse({"detail": "Forbidden"}, status_code=403)
        except Exception:
            pass
    return await call_next(request)


app.include_router(videos.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(push_tokens.router, prefix="/api/v1")
app.include_router(admin_dashboard.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(waitlist.router, prefix="/api/v1")
