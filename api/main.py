from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("storegen")


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
    logger.info("storegen — 🚀 StoreGen API starting up")
    yield
    logger.info("storegen — StoreGen API shutting down")

app = FastAPI(title="StoreGen API", version="1.0.0", lifespan=lifespan)

# ── CORS — autorise localhost ET 127.0.0.1 ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Erreur interne du serveur: {str(exc)}"},
    )

# ── Routes ─────────────────────────────────────────────────────────────────────
from routes.stores import router as stores_router
from routes.products import router as products_router
from routes.generate import router as generate_router
from routes.deploy import router as deploy_router
from routes.seo import router as seo_router

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

@app.get("/")
async def root():
    return {"status": "ok", "service": "StoreGen API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
