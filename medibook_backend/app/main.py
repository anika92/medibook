import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine, Base, get_db

logger = logging.getLogger(__name__)

# Background task reference
_timeout_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _timeout_task

    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start payment timeout background worker
    from app.services.payment_timeout import payment_timeout_worker
    _timeout_task = asyncio.create_task(
        payment_timeout_worker(get_db),
        name="payment_timeout_worker"
    )
    logger.info("Payment timeout worker started")

    yield

    # Stop background worker on shutdown
    if _timeout_task and not _timeout_task.done():
        _timeout_task.cancel()
        try:
            await _timeout_task
        except asyncio.CancelledError:
            pass
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "timeout_worker": "running" if _timeout_task and not _timeout_task.done() else "stopped"
    }

