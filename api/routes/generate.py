"""
Routes de génération IA — /generate

POST /generate         — Lancer la génération d'une boutique
GET  /generate/status/{job_id} — Vérifier le statut d'un job
POST /generate/regenerate      — Re-générer avec données mises à jour
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from dependencies import get_supabase, verify_token
from services.ai_generator import AIStoreGenerator

logger = logging.getLogger("storegen.generate")

router = APIRouter(prefix="/generate", tags=["AI Generation"])


# ─── Request / Response schemas ───────────────────────────────────────────────

class GenerateRequest(BaseModel):
    store_id: str = Field(..., description="ID de la boutique à générer")
    force_regenerate: bool = Field(
        default=False,
        description="Forcer la regénération même si un HTML existe déjà",
    )


class GenerateResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int = 0
    html: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


# ─── In-memory fallback for job tracking ──────────────────────────────────────
# Used when Supabase generation_jobs table doesn't exist yet.

_jobs_mem: Dict[str, Dict[str, Any]] = {}


# ─── Helpers: Supabase job persistence ────────────────────────────────────────

def _create_job(supabase, job_id: str, store_id: str, user_id: str) -> None:
    """Create a job entry in Supabase (or in-memory fallback)."""
    job_data = {
        "id": job_id,
        "store_id": store_id,
        "user_id": user_id,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        supabase.table("generation_jobs").insert(job_data).execute()
    except Exception as e:
        logger.warning(f"Supabase generation_jobs insert failed (using in-memory): {e}")
        _jobs_mem[job_id] = job_data


def _update_job(supabase, job_id: str, **fields) -> None:
    """Update job fields in Supabase (or in-memory fallback)."""
    try:
        supabase.table("generation_jobs").update(fields).eq("id", job_id).execute()
    except Exception:
        if job_id in _jobs_mem:
            _jobs_mem[job_id].update(fields)


def _get_job(supabase, job_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a job from Supabase (or in-memory fallback)."""
    try:
        result = (
            supabase.table("generation_jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        return _jobs_mem.get(job_id)


# ─── Background generation task ──────────────────────────────────────────────

async def _run_generation(
    job_id: str,
    store_id: str,
    user_id: str,
) -> None:
    """
    Tâche en arrière-plan :
    1. Charge les données boutique + produits depuis Supabase
    2. Génère SEO + slogan + descriptions améliorées (en parallèle)
    3. Génère le HTML complet
    4. Sauvegarde le résultat dans Supabase
    """
    supabase = get_supabase()
    generator = AIStoreGenerator(supabase_client=supabase)

    try:
        # ── Phase 0: Charger les données ─────────────────────────────────
        _update_job(supabase, job_id, status="loading", progress=5)

        store_result = (
            supabase.table("stores")
            .select("*")
            .eq("id", store_id)
            .single()
            .execute()
        )
        if not store_result.data:
            raise ValueError(f"Boutique {store_id} introuvable")

        store = store_result.data

        # Verify ownership
        if store.get("owner_id") != user_id:
            raise PermissionError("Accès refusé à cette boutique")

        products_result = (
            supabase.table("products")
            .select("*")
            .eq("store_id", store_id)
            .order("position")
            .execute()
        )
        products = products_result.data or []

        store_data = {
            "store": store,
            "products": products,
            "style_preferences": {
                "font": store.get("font_family", "Inter"),
                "effects": store.get("special_effects", []),
            },
        }

        # ── Phase 1: Génération parallèle SEO + slogan + descriptions ───
        _update_job(supabase, job_id, status="generating_metadata", progress=15)
        logger.info(f"[{job_id}] Phase 1: SEO + slogan + descriptions en parallèle")

        seo_task = generator.generate_seo(store_data)
        slogan_task = generator.generate_slogan(store_data)
        descriptions_task = generator.generate_product_descriptions(
            products, store_id=store_id
        )

        seo, slogan, improved_products = await asyncio.gather(
            seo_task, slogan_task, descriptions_task
        )

        # Enrich store_data with AI results
        store_data["seo"] = seo
        store_data["slogan"] = slogan
        store_data["products"] = improved_products

        _update_job(supabase, job_id, status="generating_html", progress=50)

        # ── Phase 2: Génération HTML complète ────────────────────────────
        logger.info(f"[{job_id}] Phase 2: Génération HTML")

        result = await generator.generate_store(store_data)

        if result.get("success"):
            _update_job(
                supabase,
                job_id,
                status="saving",
                progress=85,
            )

            # Save generated HTML to stores table
            try:
                supabase.table("stores").update(
                    {
                        "generated_html": result["html"],
                        "seo_title": seo.get("title", ""),
                        "seo_description": seo.get("description", ""),
                        "slogan": slogan,
                        "status": "generated",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                ).eq("id", store_id).execute()
            except Exception as e:
                logger.warning(f"Store update failed (non-blocking): {e}")

            _update_job(
                supabase,
                job_id,
                status="completed",
                progress=100,
                html=result["html"],
                metadata={
                    "seo": seo,
                    "slogan": slogan,
                    "usage": result.get("usage"),
                    "generated_at": result.get("generated_at"),
                },
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.info(f"[{job_id}] ✅ Génération terminée avec succès")
        else:
            # AI failed but fallback was used
            _update_job(
                supabase,
                job_id,
                status="completed_with_fallback",
                progress=100,
                html=result.get("html", ""),
                error=result.get("error", "Fallback template utilisé"),
                metadata={"seo": seo, "slogan": slogan},
                completed_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.warning(f"[{job_id}] ⚠️ Fallback template utilisé")

    except Exception as e:
        logger.error(f"[{job_id}] ❌ Génération échouée: {e}", exc_info=True)
        _update_job(
            supabase,
            job_id,
            status="failed",
            progress=0,
            error=str(e),
            completed_at=datetime.now(timezone.utc).isoformat(),
        )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=GenerateResponse)
async def start_generation(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
):
    """
    Lance la génération IA d'une boutique.
    Retourne un job_id pour suivre la progression.
    """
    supabase = get_supabase()

    # Verify store exists and user owns it
    store_result = (
        supabase.table("stores")
        .select("id, owner_id, status")
        .eq("id", req.store_id)
        .single()
        .execute()
    )
    if not store_result.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    if store_result.data["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # Check if already generated (skip if force_regenerate)
    if (
        not req.force_regenerate
        and store_result.data.get("status") == "generated"
    ):
        raise HTTPException(
            status_code=409,
            detail="La boutique est déjà générée. Utilisez force_regenerate=true ou /regenerate.",
        )

    # Create job
    job_id = str(uuid.uuid4())
    _create_job(supabase, job_id, req.store_id, user_id)

    # Update store status
    try:
        supabase.table("stores").update(
            {"status": "generating"}
        ).eq("id", req.store_id).execute()
    except Exception as e:
        logger.warning(f"Failed to update store status: {e}")

    # Launch background task
    background_tasks.add_task(_run_generation, job_id, req.store_id, user_id)

    logger.info(f"🚀 Génération lancée: job={job_id}, store={req.store_id}")
    return GenerateResponse(
        job_id=job_id,
        status="pending",
        message="Génération lancée. Utilisez /generate/status/{job_id} pour suivre.",
    )


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_generation_status(
    job_id: str,
    user_id: str = Depends(verify_token),
):
    """Vérifie le statut d'un job de génération."""
    supabase = get_supabase()
    job = _get_job(supabase, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job introuvable")

    if job.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    return JobStatusResponse(
        job_id=job_id,
        status=job.get("status", "unknown"),
        progress=job.get("progress", 0),
        html=job.get("html") if job.get("status") in ("completed", "completed_with_fallback") else None,
        metadata=job.get("metadata"),
        error=job.get("error"),
        created_at=job.get("created_at"),
        completed_at=job.get("completed_at"),
    )


@router.post("/regenerate", response_model=GenerateResponse)
async def regenerate_store(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
):
    """Re-génère une boutique (force_regenerate implicitement true)."""
    # Pydantic v2 — les modèles sont immutables par défaut, utiliser model_copy()
    forced_req = req.model_copy(update={"force_regenerate": True})
    return await start_generation(forced_req, background_tasks, user_id)
