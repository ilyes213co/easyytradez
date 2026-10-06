from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator
import re
from dependencies import get_supabase, verify_token, check_store_owner
import logging

router = APIRouter()
logger = logging.getLogger("storegen.orders")

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
async def create_order(req: CreateOrderRequest, supabase = Depends(get_supabase)):
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

    # 3. Validation stricte du store_id (suppression formelle du fallback limit(1) sur boutique aléatoire)
    if not store_id or str(store_id).strip().lower() in ("demo", "null", "undefined") or str(store_id).startswith("{{"):
        raise HTTPException(
            status_code=400,
            detail="Identifiant de boutique (store_id) manquant ou invalide pour cette commande"
        )

    # Vérification que la boutique existe et n'est pas suspendue
    store_check = supabase.table("stores").select("id, status").eq("id", store_id).execute()
    if not store_check.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable pour cette commande")
    
    if store_check.data[0].get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Cette boutique est actuellement suspendue")

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
        "customer_phone": req.customer_phone.strip(),
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


# ─── Endpoints de consultation & gestion sécurisés par Ownership ──────────────

@router.get("/{order_id}")
async def get_order(
    order_id: str,
    user_id: str = Depends(verify_token),
    supabase = Depends(get_supabase),
):
    """
    Récupère le détail d'une commande.
    Vérifie strictement que l'utilisateur connecté est le propriétaire du store associé.
    """
    order_res = (
        supabase.table("orders")
        .select("*, stores(owner_id)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    stores_data = order_res.data.get("stores")
    owner_id = stores_data.get("owner_id") if isinstance(stores_data, dict) else None
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé : vous n'êtes pas propriétaire de cette commande")

    return order_res.data


@router.patch("/{order_id}")
async def update_order_status(
    order_id: str,
    payload: UpdateOrderStatusRequest,
    user_id: str = Depends(verify_token),
    supabase = Depends(get_supabase),
):
    """
    Met à jour le statut d'une commande (ex: confirmée, livrée, annulée).
    Vérifie strictement que l'utilisateur connecté est le propriétaire du store associé.
    """
    order_res = (
        supabase.table("orders")
        .select("*, stores(owner_id)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    stores_data = order_res.data.get("stores")
    owner_id = stores_data.get("owner_id") if isinstance(stores_data, dict) else None
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé : vous n'êtes pas propriétaire de cette commande")

    update_fields = {}
    if payload.status:
        valid_statuses = ("pending", "confirmed", "shipped", "delivered", "cancelled")
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Statut invalide. Autorisés: {', '.join(valid_statuses)}")
        update_fields["status"] = payload.status

    if payload.payment_status:
        valid_payments = ("pending", "paid", "refunded")
        if payload.payment_status not in valid_payments:
            raise HTTPException(status_code=400, detail=f"Statut de paiement invalide. Autorisés: {', '.join(valid_payments)}")
        update_fields["payment_status"] = payload.payment_status

    if payload.notes is not None:
        update_fields["notes"] = payload.notes

    if not update_fields:
        return order_res.data

    res = supabase.table("orders").update(update_fields).eq("id", order_id).execute()
    return res.data[0] if res.data else order_res.data

