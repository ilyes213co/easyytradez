"""
Routes Paiement & Abonnements (SlickPay / BaridiMob / CIB)
Gestion des souscriptions SaaS aux plans Pro et Business pour les marchands.
"""

import os
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from dependencies import get_current_user, get_supabase, UserInfo
from services.slickpay import (
    SlickPayService,
    SlickPayError,
    PLANS_PRICING,
    get_plan_amount,
    get_plan_items,
)

router = APIRouter()
logger = logging.getLogger("storegen.payment")


# ── Modèles Pydantic ───────────────────────────────────────────────────────────

class SubscriptionInvoiceRequest(BaseModel):
    plan: Literal["pro", "business"]
    billing_period: Literal["monthly", "yearly"] = "monthly"
    return_url: Optional[str] = None


class SubscriptionInvoiceResponse(BaseModel):
    success: bool
    invoice_id: str
    payment_url: str
    transaction_id: Optional[str] = None
    amount: float
    currency: str = "DZD"
    is_simulation: bool = False
    message: str = "Facture créée avec succès"


class VerifySubscriptionResponse(BaseModel):
    success: bool
    is_paid: bool
    plan: str
    status: str
    expires_at: Optional[str] = None
    message: str


# ── Utilitaires DB ────────────────────────────────────────────────────────────

async def run_db(executor, timeout_seconds: int = 20):
    """Exécute une requête bloquante Supabase dans un thread pool avec timeout."""
    try:
        return await asyncio.wait_for(asyncio.to_thread(executor), timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Timeout lors de la communication avec la base de données.",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    """Retourne la liste des plans et leurs fonctionnalités."""
    return {
        "success": True,
        "plans": PLANS_PRICING,
    }


@router.get("/status")
async def get_subscription_status(
    user: UserInfo = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Retourne le plan actuel du marchand, les limites associées et la validité.
    """
    profile_res = await run_db(
        lambda: supabase.table("profiles")
        .select("id, plan, created_at, updated_at")
        .eq("id", user.id)
        .single()
        .execute()
    )

    profile_data = profile_res.data or {}
    current_plan = profile_data.get("plan", "free")
    plan_info = PLANS_PRICING.get(current_plan, PLANS_PRICING["free"])

    # Vérification optionnelle de plan_expires_at
    expires_at = None
    try:
        exp_res = await run_db(
            lambda: supabase.table("profiles")
            .select("plan_expires_at")
            .eq("id", user.id)
            .single()
            .execute()
        )
        if exp_res.data:
            expires_at = exp_res.data.get("plan_expires_at")
    except Exception:
        pass

    days_remaining = None
    is_active = True
    if expires_at:
        try:
            exp_date = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            delta = exp_date - now
            days_remaining = max(0, delta.days)
            if delta.total_seconds() < 0 and current_plan != "free":
                is_active = False
        except Exception as e:
            logger.warning(f"Erreur calcul expiration: {e}")

    return {
        "user_id": user.id,
        "plan": current_plan,
        "plan_name": plan_info.get("name", current_plan.capitalize()),
        "is_active": is_active,
        "expires_at": expires_at,
        "days_remaining": days_remaining,
        "stores_limit": plan_info.get("stores_limit", 1),
        "products_limit": plan_info.get("products_limit", 10),
        "features": plan_info.get("features", []),
    }


@router.post("/create-subscription-invoice", response_model=SubscriptionInvoiceResponse)
async def create_subscription_invoice(
    payload: SubscriptionInvoiceRequest,
    request: Request,
    user: UserInfo = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Crée une facture SlickPay pour l'abonnement du marchand
    et enregistre la transaction en attente.
    """
    amount = get_plan_amount(payload.plan, payload.billing_period)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Ce plan est gratuit ou invalide.")

    # Détermination de l'URL de retour
    platform_url = (
        os.getenv("NEXT_PUBLIC_APP_URL")
        or os.getenv("PLATFORM_URL")
        or str(request.base_url).rstrip("/")
    )
    if "127.0.0.1" in platform_url or "localhost" in platform_url:
        # En dev local, la plateforme frontend tourne typiquement sur port 3000
        platform_url = "http://localhost:3000"

    return_url = payload.return_url or f"{platform_url}/dashboard/upgrade/callback"

    # Construction des items SlickPay
    items = get_plan_items(payload.plan, payload.billing_period)

    # Initialisation du service SlickPay
    try:
        slickpay = SlickPayService()
    except SlickPayError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Récupération des informations de contact du marchand pour SlickPay
    profile_name = "Marchand StoreGen"
    profile_phone = "0555000000"
    try:
        prof_res = await run_db(
            lambda: supabase.table("profiles").select("full_name, phone").eq("id", user.id).single().execute()
        )
        if prof_res.data:
            if prof_res.data.get("full_name"):
                profile_name = prof_res.data["full_name"].strip()
            if prof_res.data.get("phone"):
                profile_phone = prof_res.data["phone"].strip()
    except Exception:
        pass

    name_parts = profile_name.split()
    firstname = name_parts[0] if name_parts else "Marchand"
    lastname = " ".join(name_parts[1:]) if len(name_parts) > 1 else "StoreGen"
    email = user.email or f"merchant_{user.id[:8]}@storegen.shop"

    # Appel création de facture
    try:
        invoice_result = await slickpay.create_invoice(
            amount=amount,
            items=items,
            return_url=return_url,
            firstname=firstname,
            lastname=lastname,
            email=email,
            phone=profile_phone,
            address="Algérie",
            comment=f"Abonnement StoreGen {payload.plan.upper()} par utilisateur {user.id}",
        )
    except SlickPayError as e:
        logger.error(f"Échec création facture SlickPay: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Erreur passerelle SlickPay: {str(e)}",
        )

    # Sauvegarde de la transaction en DB
    transaction_id = None
    try:
        tx_row = {
            "user_id": user.id,
            "plan": payload.plan,
            "amount": amount,
            "currency": "DZD",
            "billing_period": payload.billing_period,
            "invoice_id": invoice_result.invoice_id,
            "payment_url": invoice_result.payment_url,
            "status": "pending",
            "slickpay_raw": invoice_result.raw_response,
        }
        db_res = await run_db(
            lambda: supabase.table("plan_transactions").insert(tx_row).execute()
        )
        if db_res.data and len(db_res.data) > 0:
            transaction_id = db_res.data[0].get("id")
    except Exception as e:
        logger.warning(
            f"Impossible d'insérer dans plan_transactions (migration manquante ?): {e}"
        )

    return SubscriptionInvoiceResponse(
        success=True,
        invoice_id=invoice_result.invoice_id,
        payment_url=invoice_result.payment_url,
        transaction_id=transaction_id,
        amount=amount,
        currency="DZD",
        is_simulation=invoice_result.is_simulation,
        message="Redirection vers la passerelle BaridiMob...",
    )


@router.get("/verify", response_model=VerifySubscriptionResponse)
async def verify_subscription_payment(
    invoice_id: str = Query(..., description="ID de facture SlickPay"),
    transaction_id: Optional[str] = Query(None, description="UUID transaction optionnel"),
    user: UserInfo = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Vérifie le paiement d'une facture SlickPay auprès du serveur et active le plan.
    Idempotent : ne réactive pas si déjà payé.
    """
    # 1. Récupération de la transaction en base
    transaction = None
    try:
        query = supabase.table("plan_transactions").select("*")
        if transaction_id:
            query = query.eq("id", transaction_id)
        else:
            query = query.eq("invoice_id", invoice_id)

        tx_res = await run_db(lambda: query.execute())
        if tx_res.data and len(tx_res.data) > 0:
            transaction = tx_res.data[0]
    except Exception as e:
        logger.warning(f"Recherche transaction échouée: {e}")

    # Si déjà marqué comme payé en base
    if transaction and transaction.get("status") == "paid":
        return VerifySubscriptionResponse(
            success=True,
            is_paid=True,
            plan=transaction.get("plan", "pro"),
            status="paid",
            expires_at=transaction.get("expires_at"),
            message="Abonnement déjà actif et validé.",
        )

    # 2. Vérification auprès de SlickPay
    try:
        slickpay = SlickPayService()
        status_res = await slickpay.get_invoice(invoice_id)
    except SlickPayError as e:
        logger.error(f"Erreur vérification facture SlickPay: {e}")
        raise HTTPException(status_code=502, detail=f"Erreur vérification SlickPay: {e}")

    target_plan = transaction.get("plan") if transaction else "pro"
    billing_period = transaction.get("billing_period") if transaction else "monthly"

    if not status_res.is_paid:
        return VerifySubscriptionResponse(
            success=False,
            is_paid=False,
            plan=target_plan,
            status=status_res.status_raw,
            message="Le paiement n'a pas encore été confirmé par BaridiMob / SlickPay.",
        )

    # 3. Le paiement est validé ! Calcul de la nouvelle date d'expiration
    days = 365 if billing_period == "yearly" else 30
    expires_at_dt = datetime.now(timezone.utc) + timedelta(days=days)
    expires_at_iso = expires_at_dt.isoformat()

    # Mise à jour du profil marchand
    try:
        # Tente mise à jour avec plan_expires_at
        try:
            await run_db(
                lambda: supabase.table("profiles")
                .update({
                    "plan": target_plan,
                    "plan_expires_at": expires_at_iso,
                })
                .eq("id", user.id)
                .execute()
            )
        except Exception:
            # Fallback si colonne plan_expires_at non migrée
            await run_db(
                lambda: supabase.table("profiles")
                .update({"plan": target_plan})
                .eq("id", user.id)
                .execute()
            )
        logger.info(f"Profil utilisateur {user.id} mis à niveau vers {target_plan}")
    except Exception as e:
        logger.error(f"Erreur mise à jour profil utilisateur {user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la mise à jour de votre compte: {e}",
        )

    # Mise à jour de la table plan_transactions
    if transaction:
        try:
            await run_db(
                lambda: supabase.table("plan_transactions")
                .update({
                    "status": "paid",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": expires_at_iso,
                    "slickpay_raw": status_res.raw_response,
                })
                .eq("id", transaction["id"])
                .execute()
            )
        except Exception as e:
            logger.warning(f"Erreur mise à jour statut transaction {transaction.get('id')}: {e}")

    return VerifySubscriptionResponse(
        success=True,
        is_paid=True,
        plan=target_plan,
        status="paid",
        expires_at=expires_at_iso,
        message=f"Félicitations ! Votre abonnement {target_plan.upper()} est désormais actif.",
    )


@router.post("/webhook")
async def slickpay_webhook(
    request: Request,
    supabase = Depends(get_supabase),
):
    """
    Webhook asynchrone reçu depuis SlickPay lors d'un paiement réussi.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    logger.info(f"SlickPay Webhook reçu: {body}")

    # Extraction des infos de la facture
    raw_data = body.get("data", body)
    invoice_id = str(raw_data.get("id") or raw_data.get("invoice_id") or "")
    if not invoice_id:
        return {"status": "ignored", "reason": "No invoice_id"}

    # Vérification auprès de SlickPay pour éviter toute tentative d'usurpation de webhook
    slickpay = SlickPayService()
    try:
        status_res = await slickpay.get_invoice(invoice_id)
    except Exception as e:
        logger.error(f"Webhook: échec vérification auprès de SlickPay: {e}")
        return {"status": "error", "message": str(e)}

    if not status_res.is_paid:
        return {"status": "pending", "message": "Payment not confirmed"}

    # Recherche transaction
    try:
        tx_res = await run_db(
            lambda: supabase.table("plan_transactions")
            .select("*")
            .eq("invoice_id", invoice_id)
            .execute()
        )
        if not tx_res.data or len(tx_res.data) == 0:
            return {"status": "not_found"}

        tx = tx_res.data[0]
        if tx.get("status") == "paid":
            return {"status": "already_processed"}

        days = 365 if tx.get("billing_period") == "yearly" else 30
        exp_dt = datetime.now(timezone.utc) + timedelta(days=days)
        exp_iso = exp_dt.isoformat()

        # Update profile
        try:
            await run_db(
                lambda: supabase.table("profiles")
                .update({"plan": tx["plan"], "plan_expires_at": exp_iso})
                .eq("id", tx["user_id"])
                .execute()
            )
        except Exception:
            await run_db(
                lambda: supabase.table("profiles")
                .update({"plan": tx["plan"]})
                .eq("id", tx["user_id"])
                .execute()
            )

        # Update transaction
        await run_db(
            lambda: supabase.table("plan_transactions")
            .update({
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": exp_iso,
                "slickpay_raw": status_res.raw_response,
            })
            .eq("id", tx["id"])
            .execute()
        )

        return {"status": "success", "user_id": tx["user_id"], "plan": tx["plan"]}
    except Exception as e:
        logger.error(f"Erreur traitement webhook: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/transactions")
async def get_user_transactions(
    user: UserInfo = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    """
    Retourne l'historique des transactions d'abonnement du marchand connecté.
    """
    try:
        res = await run_db(
            lambda: supabase.table("plan_transactions")
            .select("id, plan, amount, currency, billing_period, invoice_id, payment_url, status, paid_at, expires_at, created_at")
            .eq("user_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"success": True, "transactions": res.data or []}
    except Exception as e:
        logger.warning(f"Impossible de charger les transactions: {e}")
        return {"success": True, "transactions": []}
