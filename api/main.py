from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
import re
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("storegen")

CORS_ORIGIN_REGEX = r"^https?://([a-zA-Z0-9-]+\.)?(vercel\.app|localhost|127\.0\.0\.1)(:\d+)?$"


def setup_logging() -> None:
    """Configure logging once at application startup."""
    if not logging.getLogger("storegen").handlers:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def get_allowed_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    if origins:
        return origins
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("storegen — 🚀 StoreGen API starting up")
    yield
    logger.info("storegen — StoreGen API shutting down")

app = FastAPI(title="StoreGen API", version="1.0.0", lifespan=lifespan)

# ── CORS — autorise localhost, 127.0.0.1 et déploiements Vercel ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    origin = request.headers.get("origin")
    allowed_origins = get_allowed_origins()
    matched_origin: str | None = None
    if origin:
        if origin in allowed_origins or re.match(CORS_ORIGIN_REGEX, origin):
            matched_origin = origin

    response = JSONResponse(
        status_code=500,
        content={"detail": f"Erreur interne du serveur: {str(exc)}"},
    )
    if matched_origin:
        response.headers["Access-Control-Allow-Origin"] = matched_origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# ── Routes ─────────────────────────────────────────────────────────────────────
from routes.stores import router as stores_router
from routes.products import router as products_router
from routes.generate import router as generate_router
from routes.deploy import router as deploy_router
from routes.seo import router as seo_router
from routes.orders import router as orders_router
from routes.team import router as team_router

try:
    from routes.upload import router as upload_router
    app.include_router(upload_router, prefix="/upload", tags=["upload"])
except Exception as e:
    logger.warning(f"upload router not loaded: {e}")

try:
    from routes.analytics import router as analytics_router
    app.include_router(analytics_router)
except Exception as e:
    logger.warning(f"analytics router not loaded: {e}")

app.include_router(stores_router, prefix="/stores", tags=["stores"])
app.include_router(products_router, prefix="/products", tags=["products"])
app.include_router(generate_router)
app.include_router(deploy_router, prefix="/deploy", tags=["deploy"])
app.include_router(seo_router, prefix="/seo", tags=["seo"])
app.include_router(orders_router, prefix="/orders", tags=["orders"])
app.include_router(team_router, prefix="/team", tags=["team"])

@app.get("/")
async def root():
    return {"status": "ok", "service": "StoreGen API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)
