from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator
import re
import os
import json
import logging
import urllib.request
from datetime import datetime, timedelta, timezone
from dependencies import get_supabase, verify_token, check_store_owner


router = APIRouter()
logger = logging.getLogger("storegen.orders")

# ─── Algérie Phone & Sécurité Helpers ──────────────────────────────────────────

def normalize_dz_phone(raw_phone: str) -> str:
    """Nettoie et normalise un numéro algérien au format standard 10 chiffres (ex: 0555123456)."""
    digits = re.sub(r"\D", "", str(raw_phone or ""))
    if digits.startswith("00213"):
        digits = digits[5:]
    elif digits.startswith("213"):
        digits = digits[3:]
    if len(digits) == 9 and digits[0] in ("5", "6", "7"):
        digits = "0" + digits
    return digits


def is_valid_strict_dz_phone(cleaned_phone: str) -> bool:
    """Valide qu'un numéro DZ comporte exactement 10 chiffres et commence par 05, 06 ou 07."""
    return bool(re.match(r"^0[567]\d{8}$", cleaned_phone))


def send_telegram_order_notification(bot_token: str, chat_id: str, order_data: dict, store_name: str):
    """Envoie un récapitulatif de commande formaté sur Telegram sans ralentir la requête."""
    try:
        items_list = order_data.get("items") or []
        items_lines = []
        for it in items_list:
            name = it.get("name") or "Article"
            q = it.get("quantity") or 1
            price = it.get("price") or 0
            items_lines.append(f"  • {name} × {q} ({price} DZD)")
        items_str = "\n".join(items_lines) if items_lines else "  • 1x Commande directe"

        ref = str(order_data.get("id", ""))[-6:].upper()
        text = (
            f"🛍️ <b>Nouvelle commande reçue !</b>\n\n"
            f"🏪 <b>Boutique :</b> {store_name}\n"
            f"🔖 <b>Réf :</b> #{ref}\n\n"
            f"📦 <b>Articles :</b>\n{items_str}\n\n"
            f"👤 <b>Client :</b> {order_data.get('customer_name')}\n"
            f"📞 <b>Téléphone :</b> <code>{order_data.get('customer_phone')}</code>\n"
            f"📍 <b>Adresse / Wilaya :</b> {order_data.get('customer_address')}\n"
            f"💰 <b>Total C.O.D :</b> <b>{order_data.get('total_amount')} DZD</b>\n"
        )
        if order_data.get("notes"):
            text += f"📝 <b>Note :</b> {order_data.get('notes')}\n"

        req = urllib.request.Request(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            data=json.dumps({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=5)
        logger.info(f"Notification Telegram envoyée avec succès au chat {chat_id}")
    except Exception as e:
        logger.warning(f"Échec notification Telegram (non-bloquant): {e}")

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    product_id: Optional[str] = None
    options_selected: Optional[Dict[str, Any]] = Field(default_factory=dict)
    qty: Optional[int] = Field(default=1, ge=1, le=1000)
    wilaya_id: Optional[int] = None
    ship_mode: Optional[str] = "domicile"  # 'domicile' ou 'stopdesk'
    customer_name: str = Field(..., min_length=2, max_length=120)
    customer_phone: str = Field(..., min_length=9, max_length=20)
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    wilaya: Optional[str] = None
    store_id: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    total_amount: Optional[float] = Field(default=None, ge=0)
    payment_method: Optional[str] = "cod"
    notes: Optional[str] = None

    @field_validator("customer_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Le nom du client doit comporter au moins 2 caractères")
        return cleaned

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"\D", "", v)
        if len(cleaned) < 9 or len(cleaned) > 15:
            raise ValueError("Numéro de téléphone invalide (au moins 9 chiffres requis)")
        return v.strip()


class UpdateOrderStatusRequest(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None
    call_attempts: Optional[int] = None
    agent_notes: Optional[str] = None
    cancel_reason: Optional[str] = None
    assigned_to: Optional[str] = None



# Fallback wilayas data au cas où la table n'est pas encore migrée
DEFAULT_WILAYAS_DATA = {
    1: ("Adrar", 950, 600, "3-5 j"),
    9: ("Blida", 500, 300, "24-48h"),
    16: ("Alger", 500, 300, "24-48h"),
    31: ("Oran", 400, 250, "24-48h"),
    25: ("Constantine", 700, 400, "2-4 j"),
    23: ("Annaba", 750, 450, "2-4 j"),
    19: ("Sétif", 700, 400, "2-4 j"),
}

@router.get("/wilayas")
@router.get("/wilayas/")
async def list_wilayas(supabase = Depends(get_supabase)):
    """Retourne la liste des 58 wilayas d'Algérie avec tarifs et délais."""
    try:
        res = supabase.table("wilayas").select("*").order("id", desc=False).execute()
        if res.data:
            return res.data
    except Exception as e:
        logger.warning(f"Lecture table wilayas échouée ({e}), fallback")
    
    return [
        {"id": w_id, "name": name, "price_home": p_home, "price_desk": p_desk, "eta": eta}
        for w_id, (name, p_home, p_desk, eta) in DEFAULT_WILAYAS_DATA.items()
    ]

@router.post("")
@router.post("/")
async def create_order(
    req: CreateOrderRequest,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    supabase = Depends(get_supabase)
):
    """Enregistre une commande produit direct ou multi-articles avec calcul COD."""
    store_id = req.store_id
    product = None
    delivery_cost = 0.0
    wilaya_name = req.wilaya

    # 1. Résolution de la wilaya
    if req.wilaya_id:
        try:
            w_res = supabase.table("wilayas").select("*").eq("id", req.wilaya_id).single().execute()
            if w_res.data:
                wilaya_name = w_res.data.get("name")
                delivery_cost = float(w_res.data.get("price_home") if req.ship_mode == "domicile" else w_res.data.get("price_desk"))
        except Exception as e:
            logger.warning(f"Impossible de lire la table wilayas ({e}), fallback mémoire")
            if req.wilaya_id in DEFAULT_WILAYAS_DATA:
                name, p_home, p_desk, _ = DEFAULT_WILAYAS_DATA[req.wilaya_id]
                wilaya_name = name
                delivery_cost = float(p_home if req.ship_mode == "domicile" else p_desk)
            else:
                delivery_cost = 500.0

    # 2. Résolution du produit si product_id fourni
    items = req.items or []
    if req.product_id:
        prod_res = supabase.table("products").select("*").eq("id", str(req.product_id)).single().execute()
        if prod_res.data:
            product = prod_res.data
            store_id = store_id or product.get("store_id")
            unit_price = float(product.get("price", 0.0))
            quantity = max(1, req.qty or 1)
            item_entry = {
                "product_id": product.get("id"),
                "name": product.get("name"),
                "price": unit_price,
                "quantity": quantity,
                "options_selected": req.options_selected or {},
            }
            if not req.items:
                items = [item_entry]

    # 3. Validation stricte du store_id
    if not store_id or str(store_id).strip().lower() in ("demo", "null", "undefined") or str(store_id).startswith("{{"):
        raise HTTPException(
            status_code=400,
            detail="Identifiant de boutique (store_id) manquant ou invalide pour cette commande"
        )

    # Vérification que la boutique existe et récupération des settings de sécurité
    store_check = supabase.table("stores").select("id, name, status, settings").eq("id", store_id).execute()
    if not store_check.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable pour cette commande")
    
    store_record = store_check.data[0]
    if store_record.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Cette boutique est actuellement suspendue")

    store_settings = store_record.get("settings") or {}
    security = store_settings.get("security") or {}

    # ─── Sécurité COD & Anti-Fake Orders (Spécial Algérie) ───────────────────
    clean_dz_phone = normalize_dz_phone(req.customer_phone)

    # A. Validation stricte numéro DZ (10 chiffres commençant par 05, 06 ou 07)
    if security.get("strict_dz_phone", True):
        if not is_valid_strict_dz_phone(clean_dz_phone):
            raise HTTPException(
                status_code=400,
                detail="Numéro de téléphone algérien invalide. Il doit comporter 10 chiffres et commencer obligatoirement par 05, 06 ou 07."
            )

    # B. Vérification Liste Noire (Blacklist)
    blacklist = security.get("blacklist") or []
    if blacklist:
        normalized_blacklist = {normalize_dz_phone(b) for b in blacklist if b}
        if clean_dz_phone in normalized_blacklist:
            raise HTTPException(
                status_code=400,
                detail="Ce numéro de téléphone n'est pas autorisé à passer commande sur cette boutique."
            )

    # C. Anti-Spam commandes (limite à 2 commandes sur 24h par numéro)
    if security.get("anti_spam_orders"):
        cutoff_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        try:
            recent_orders = (
                supabase.table("orders")
                .select("id, customer_phone")
                .eq("store_id", store_id)
                .gte("created_at", cutoff_24h)
                .execute()
            )
            matching = [
                o for o in (recent_orders.data or [])
                if normalize_dz_phone(o.get("customer_phone") or "") == clean_dz_phone
            ]
            if len(matching) >= 2:
                raise HTTPException(
                    status_code=400,
                    detail="Limite de commandes atteinte pour ce numéro dans les dernières 24h. Veuillez patienter ou contacter le service client."
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Vérification anti-spam non bloquante échouée: {e}")

    # 4. Calcul du montant total
    if req.total_amount is not None and req.total_amount > 0:
        total_amount = float(req.total_amount)
    elif product:
        subtotal = float(product.get("price", 0.0)) * max(1, req.qty or 1)
        total_amount = subtotal + delivery_cost
    elif items:
        subtotal = sum(float(it.get("price", 0)) * int(it.get("quantity", 1)) for it in items)
        total_amount = subtotal + delivery_cost
    else:
        total_amount = 0.0

    # 5. Formatage de l'adresse
    mode_str = "À domicile" if req.ship_mode == "domicile" else "Stop Desk"
    address_parts = []
    if wilaya_name:
        address_parts.append(f"Wilaya: {wilaya_name} ({mode_str})")
    if req.customer_address:
        address_parts.append(req.customer_address.strip())
    full_address = " — ".join(address_parts) if address_parts else "Non spécifiée"

    payment_label = {
        "cod": "Paiement à la livraison",
        "baridimob": "BaridiMob / CCP",
        "stripe": "Carte bancaire (Stripe)",
    }.get(req.payment_method or "cod", req.payment_method or "Paiement à la livraison")

    clean_notes = req.notes.strip() if (req.notes and req.notes.strip()) else None

    payload = {
        "store_id": store_id,
        "customer_name": req.customer_name.strip(),
        "customer_phone": clean_dz_phone or req.customer_phone.strip(),
        "customer_email": req.customer_email,
        "customer_address": full_address,
        "items": items,
        "total_amount": round(total_amount, 2),
        "status": "pending",
        "payment_status": "pending",
        "notes": clean_notes,
    }

    try:
        res = supabase.table("orders").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Impossible d'enregistrer la commande")

        created_order = res.data[0]

        # ─── Smart Dispatch Call Center (Global : Boutiques & Funnels) ────────
        try:
            from services.dispatcher import assign_order_smartly
            dispatch_res = assign_order_smartly(created_order.get("id"), store_id, supabase)
            if dispatch_res.get("success"):
                created_order["assigned_to"] = dispatch_res.get("assigned_to")
                created_order["assigned_at"] = dispatch_res.get("assigned_at")
        except Exception as e:
            logger.warning(f"SmartDispatch non bloquant: {e}")

        # ─── Déduction automatique des stocks ─────────────────────────────────
        try:
            for item in items:
                prod_id = item.get("product_id") or item.get("id")
                qty = max(1, int(item.get("quantity", 1)))
                if not prod_id:
                    continue

                prod_fetch = (
                    supabase.table("products")
                    .select("stock_quantity")
                    .eq("id", str(prod_id))
                    .single()
                    .execute()
                )
                if prod_fetch.data:
                    curr_stock = prod_fetch.data.get("stock_quantity") or 0
                    supabase.table("products").update({
                        "stock_quantity": max(0, curr_stock - qty)
                    }).eq("id", str(prod_id)).execute()
        except Exception as e:
            logger.warning(f"Déduction de stock non bloquante: {e}")

        # ─── Alerte Telegram instantanée (BackgroundTasks) ────────────────────
        notifications = store_settings.get("notifications") or {}
        telegram_chat_id = (notifications.get("telegram_chat_id") or "").strip()
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if telegram_chat_id and bot_token and background_tasks:
            background_tasks.add_task(
                send_telegram_order_notification,
                bot_token,
                telegram_chat_id,
                created_order,
                store_record.get("name") or "Boutique"
            )

        return {
            "message": "Commande enregistrée avec succès",
            "order_id": created_order.get("id"),
            "total_amount": total_amount,
            "order": created_order,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur enregistrement commande: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")


# ─── Endpoints de consultation & gestion sécurisés (Owner + Équipe Globale) ───

VALID_CALL_CENTER_STATUSES = (
    "pending",
    "confirmed",
    "no_answer",
    "callback",
    "postponed",
    "shipped",
    "delivered",
    "cancelled",
    "unreachable",
    "wrong_number",
    "duplicate",
)


def _check_user_order_access(order_data: dict, user_id: str, supabase) -> bool:
    """Vérifie si l'utilisateur est propriétaire ou membre actif de l'équipe du store."""
    stores_data = order_data.get("stores")
    owner_id = stores_data.get("owner_id") if isinstance(stores_data, dict) else None
    store_id = order_data.get("store_id")

    if owner_id and owner_id == user_id:
        return True

    # Vérification membre de l'équipe globale (par owner_id ou store_id)
    try:
        query = supabase.table("store_members").select("id, status").eq("user_id", user_id)
        if owner_id:
            query = query.or_(f"owner_id.eq.{owner_id},store_id.eq.{store_id}")
        else:
            query = query.eq("store_id", store_id)
        mem_res = query.execute()
        active = [
            m for m in (mem_res.data or [])
            if isinstance(m, dict) and str(m.get("status", "")).lower() in ("active", "invited", "")
        ]
        return bool(active)
    except Exception as e:
        logger.warning(f"Erreur vérification appartenance équipe: {e}")
        return False


@router.get("")
@router.get("/")
async def list_orders(
    store_id: Optional[str] = Query(None, description="Filtrer par boutique spécifique"),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    user_id: str = Depends(verify_token),
    supabase = Depends(get_supabase),
):
    """
    Récupère la liste des commandes :
    - Propriétaire : toutes les commandes de ses boutiques et funnels.
    - Employé (membre) : accès automatique aux commandes de TOUS les funnels et boutiques de son employeur.
    Chaque commande inclut les infos du Store/Funnel (nom, type).
    """
    # 1. Vérifier si l'utilisateur est un propriétaire ayant des stores
    owner_stores_res = (
        supabase.table("stores")
        .select("id, name, type, owner_id")
        .eq("owner_id", user_id)
        .execute()
    )
    accessible_stores = owner_stores_res.data or []

    # 2. Si pas propriétaire, vérifier s'il est membre de l'équipe globale d'un propriétaire
    if not accessible_stores:
        member_res = (
            supabase.table("store_members")
            .select("owner_id, store_id")
            .eq("user_id", user_id)
            .execute()
        )
        memberships = member_res.data or []
        owner_ids = [m["owner_id"] for m in memberships if isinstance(m, dict) and m.get("owner_id")]
        
        if owner_ids:
            team_stores = (
                supabase.table("stores")
                .select("id, name, type, owner_id")
                .in_("owner_id", owner_ids)
                .execute()
            )
            accessible_stores = team_stores.data or []
        elif memberships:
            # Fallback rétro-compatible par store_id
            direct_store_ids = [m["store_id"] for m in memberships if isinstance(m, dict) and m.get("store_id")]
            if direct_store_ids:
                team_stores = (
                    supabase.table("stores")
                    .select("id, name, type, owner_id")
                    .in_("id", direct_store_ids)
                    .execute()
                )
                accessible_stores = team_stores.data or []

    if not accessible_stores:
        return {"orders": [], "count": 0}

    store_map = {s["id"]: s for s in accessible_stores if isinstance(s, dict) and s.get("id")}
    allowed_store_ids = list(store_map.keys())

    if store_id:
        if store_id not in allowed_store_ids:
            raise HTTPException(status_code=403, detail="Accès refusé à cette boutique")
        allowed_store_ids = [store_id]

    query = (
        supabase.table("orders")
        .select("*")
        .in_("store_id", allowed_store_ids)
        .order("created_at", desc=True)
    )

    if status and status != "all":
        query = query.eq("status", status)

    res = query.execute()
    orders = res.data or []

    # Attacher les métadonnées de la boutique/funnel (nom et type)
    for ord_row in orders:
        if isinstance(ord_row, dict):
            st = store_map.get(ord_row.get("store_id"), {})
            ord_row["store_name"] = st.get("name") or "Boutique"
            ord_row["store_type"] = st.get("type") or "boutique"

    return {"orders": orders, "count": len(orders)}


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    user_id: str = Depends(verify_token),
    supabase = Depends(get_supabase),
):
    """
    Récupère le détail d'une commande.
    Accessible au propriétaire et à tous les membres de son équipe globale.
    """
    order_res = (
        supabase.table("orders")
        .select("*, stores(id, name, type, owner_id)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    if not order_res or not order_res.data:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    order_data = order_res.data
    if not _check_user_order_access(order_data, user_id, supabase):
        raise HTTPException(status_code=403, detail="Accès refusé : vous n'êtes pas propriétaire de cette commande")

    stores_data = order_data.get("stores") or {}
    if isinstance(stores_data, dict):
        order_data["store_name"] = stores_data.get("name") or "Boutique"
        order_data["store_type"] = stores_data.get("type") or "boutique"

    return order_data


@router.patch("/{order_id}")
async def update_order_status(
    order_id: str,
    payload: UpdateOrderStatusRequest,
    user_id: str = Depends(verify_token),
    supabase = Depends(get_supabase),
):
    """
    Met à jour le statut et les champs Call Center d'une commande.
    Accessible au propriétaire et aux téléopérateurs de son équipe globale.
    """
    order_res = (
        supabase.table("orders")
        .select("*, stores(id, name, type, owner_id)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    if not order_res or not order_res.data:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    order_data = order_res.data
    if not _check_user_order_access(order_data, user_id, supabase):
        raise HTTPException(status_code=403, detail="Accès refusé : vous n'êtes pas propriétaire de cette commande")

    update_fields: Dict[str, Any] = {}
    now_iso = datetime.now(timezone.utc).isoformat()

    if payload.status:
        if payload.status not in VALID_CALL_CENTER_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Statut invalide. Autorisés: {', '.join(VALID_CALL_CENTER_STATUSES)}"
            )
        update_fields["status"] = payload.status
        if payload.status == "confirmed":
            update_fields["confirmed_by"] = user_id
            update_fields["confirmed_at"] = now_iso

    if payload.payment_status:
        valid_payments = ("pending", "paid", "refunded")
        if payload.payment_status not in valid_payments:
            raise HTTPException(
                status_code=400,
                detail=f"Statut de paiement invalide. Autorisés: {', '.join(valid_payments)}"
            )
        update_fields["payment_status"] = payload.payment_status

    if payload.notes is not None:
        update_fields["notes"] = payload.notes

    if payload.agent_notes is not None:
        update_fields["agent_notes"] = payload.agent_notes

    if payload.cancel_reason is not None:
        update_fields["cancel_reason"] = payload.cancel_reason

    if payload.call_attempts is not None:
        update_fields["call_attempts"] = payload.call_attempts
    elif payload.status in ("no_answer", "callback"):
        curr_attempts = order_data.get("call_attempts") or 0
        update_fields["call_attempts"] = curr_attempts + 1

    if payload.assigned_to is not None:
        update_fields["assigned_to"] = payload.assigned_to
        update_fields["assigned_at"] = now_iso

    if not update_fields:
        return order_data

    try:
        from db_resilience import safe_update
        res = safe_update("orders", update_fields, "id", order_id, supabase)
        if res and res.data:
            return res.data[0]
    except Exception:
        pass

    res = supabase.table("orders").update(update_fields).eq("id", order_id).execute()
    return res.data[0] if (res and res.data) else {**order_data, **update_fields}



