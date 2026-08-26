from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any
import logging
import re
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from dependencies import get_current_user, get_supabase
from models.schemas import DeployResponse, DeployStatusResponse
from services.ai_generator import AIStoreGenerator
from services.deployer import StoreDeployer

router = APIRouter()
logger = logging.getLogger("storegen.deploy")

generator = AIStoreGenerator()
deployer = StoreDeployer()

_memory_jobs: dict[str, dict[str, Any]] = {}
_memory_jobs_lock = Lock()
_unsupported_deploy_job_columns: set[str] = set()
_unsupported_deploy_job_columns_lock = Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _job_payload(job_id: str, store_id: str, user_id: str, **overrides: Any) -> dict[str, Any]:
    payload = {
        "id": job_id,
        "store_id": store_id,
        "user_id": user_id,
        "status": "pending",
        "url": None,
        "error": None,
        "warning": None,
        "created_at": _utc_now(),
        "completed_at": None,
    }
    payload.update(overrides)
    return payload


def _persist_job(job: dict[str, Any]) -> None:
    with _memory_jobs_lock:
        _memory_jobs[job["id"]] = job.copy()

    base_payload = job.copy()

    while True:
        with _unsupported_deploy_job_columns_lock:
            payload = {
                key: value
                for key, value in base_payload.items()
                if key not in _unsupported_deploy_job_columns
            }

        try:
            get_supabase().table("deploy_jobs").upsert(payload).execute()
            return
        except Exception as exc:
            message = str(exc)
            match = re.search(r"Could not find the '([^']+)' column of 'deploy_jobs'", message)
            missing_column = match.group(1) if match else None

            if missing_column and missing_column in payload:
                with _unsupported_deploy_job_columns_lock:
                    _unsupported_deploy_job_columns.add(missing_column)
                logger.warning(
                    "Persisting deploy job %s retried without unsupported column %s",
                    job["id"],
                    missing_column,
                )
                continue

            logger.warning("Persisting deploy job %s failed: %s", job["id"], exc)
            return


def _set_job(job_id: str, **updates: Any) -> dict[str, Any]:
    with _memory_jobs_lock:
        current = (_memory_jobs.get(job_id) or {}).copy()

    if not current:
        current = {"id": job_id, "created_at": _utc_now()}

    current.update(updates)
    _persist_job(current)
    return current


def _get_job(job_id: str) -> dict[str, Any] | None:
    try:
        result = (
            get_supabase()
            .table("deploy_jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        if result.data:
            with _memory_jobs_lock:
                _memory_jobs[job_id] = result.data.copy()
            return result.data
    except Exception:
        pass

    with _memory_jobs_lock:
        job = _memory_jobs.get(job_id)
        return job.copy() if job else None


def _status_response(job: dict[str, Any]) -> DeployStatusResponse:
    return DeployStatusResponse(
        status=job["status"],
        url=job.get("url"),
        error=job.get("error"),
        warning=job.get("warning"),
    )


@router.post("/{store_id}", response_model=DeployResponse)
async def deploy_store(
    store_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    store = (
        supabase.table("stores")
        .select("*")
        .eq("id", store_id)
        .eq("owner_id", user.id)
        .single()
        .execute()
    )
    if not store.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")

    products = (
        supabase.table("products")
        .select("*")
        .eq("store_id", store_id)
        .order("position")
        .execute()
    )

    job_id = str(uuid.uuid4())
    job = _job_payload(job_id, store_id, user.id)
    _persist_job(job)

    store_data = {
        "store": store.data,
        "products": products.data or [],
        "style_preferences": {
            "font": store.data.get("font_family", "modern"),
            "effects": store.data.get("special_effects", []),
        },
    }

    background_tasks.add_task(_run_deploy_pipeline, job_id, store_id, user.id, store_data)

    return DeployResponse(
        job_id=job_id,
        message="Deploiement lance. Votre boutique sera en ligne dans ~2 minutes.",
    )


async def _run_deploy_pipeline(job_id: str, store_id: str, user_id: str, store_data: dict[str, Any]) -> None:
    try:
        _set_job(job_id, store_id=store_id, user_id=user_id, status="generating", error=None)
        result = await generator.generate_store(store_data)
        html = result["html"]
        seo = result.get("seo", {})
        warning = result.get("error") if result.get("success") is False else None
        if warning:
            logger.warning("Deploy job %s using fallback template: %s", job_id, warning)
            _set_job(job_id, warning=warning)

        _set_job(job_id, status="deploying", error=None)
        deploy_result = await deployer.deploy_store(store_id, html, seo)

        _set_job(
            job_id,
            status="ready",
            url=deploy_result["url"],
            error=None,
            warning=warning,
            completed_at=_utc_now(),
        )
        logger.info("Deploy job %s completed: %s", job_id, deploy_result["url"])
    except Exception as exc:
        logger.error("Deploy job %s failed: %s", job_id, exc, exc_info=True)
        _set_job(
            job_id,
            store_id=store_id,
            user_id=user_id,
            status="error",
            error=str(exc),
            completed_at=_utc_now(),
        )


@router.get("/status/{job_id}", response_model=DeployStatusResponse)
async def deploy_status(job_id: str, user=Depends(get_current_user)):
    job = _get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")
    if job.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return _status_response(job)


@router.post("/{store_id}/redeploy", response_model=DeployResponse)
async def redeploy_store(
    store_id: str,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    return await deploy_store(store_id, background_tasks, user, supabase)
