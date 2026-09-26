from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from dependencies import get_supabase
import logging

router = APIRouter()
logger = logging.getLogger("storegen.orders")

class CreateOrderRequest(BaseModel):
    store_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    wilaya: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    total_amount: float = 0.0
    payment_method: Optional[str] = "cod"
    notes: Optional[str] = None

@router.post("")
@router.post("/")
async def create_order(req: CreateOrderRequest, supabase = Depends(get_supabase)):
    store_id = req.store_id
    if not store_id or store_id == "demo" or str(store_id).startswith("{{"):
        res = supabase.table("stores").select("id").order("created_at", desc=True).limit(1).execute()
        if res.data:
            store_id = res.data[0]["id"]
            
    if not store_id:
        raise HTTPException(status_code=400, detail="Boutique introuvable")

    if req.wilaya and req.customer_address:
        full_address = f"Wilaya {req.wilaya} — {req.customer_address}"
    elif req.wilaya:
        full_address = f"Wilaya {req.wilaya}"
    else:
        full_address = req.customer_address or "Non spécifiée"
    
    items = req.items or [{"name": "Commande Directe", "price": req.total_amount, "quantity": 1}]
    
    # Store payment method into notes if not empty
    payment_label = {
        "cod": "Paiement à la livraison",
        "baridimob": "BaridiMob / CCP",
        "stripe": "Carte bancaire (Stripe)",
    }.get(req.payment_method or "cod", req.payment_method or "Paiement à la livraison")
    
    formatted_notes = f"[Paiement: {payment_label}] {req.notes or ''}".strip()

    payload = {
        "store_id": store_id,
        "customer_name": req.customer_name.strip(),
        "customer_phone": req.customer_phone.strip(),
        "customer_email": req.customer_email,
        "customer_address": full_address,
        "items": items,
        "total_amount": float(req.total_amount),
        "status": "pending",
        "payment_status": "pending",
        "notes": formatted_notes,
    }
    
    try:
        res = supabase.table("orders").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Impossible d'enregistrer la commande")
        
        # ─── Déduction automatique des stocks (Produit & Variantes) ───────────
        try:
            for item in items:
                prod_id = item.get("product_id") or item.get("id")
                qty = max(1, int(item.get("quantity", 1)))
                if not prod_id:
                    continue
                
                # Récupérer le produit actuel
                prod_res = (
                    supabase.table("products")
                    .select("*")
                    .eq("id", str(prod_id))
                    .single()
                    .execute()
                )
                if prod_res.data:
                    current_stock = prod_res.data.get("stock_quantity") or 0
                    new_stock = max(0, current_stock - qty)
                    variants = prod_res.data.get("variants") or []
                    
                    variant_id = item.get("variant_id")
                    if variant_id and isinstance(variants, list):
                        for v in variants:
                            if str(v.get("id")) == str(variant_id):
                                v_stock = v.get("stock", 0)
                                v["stock"] = max(0, int(v_stock) - qty)
                    
                    upd_prod = {"stock_quantity": new_stock}
                    if "variants" in prod_res.data:
                        upd_prod["variants"] = variants
                    
                    from db_resilience import safe_update
                    safe_update("products", upd_prod, "id", str(prod_id), supabase)
        except Exception as stock_err:
            logger.warning(f"Erreur lors de la mise à jour des stocks: {stock_err}")

        logger.info(f"Nouvelle commande reçue pour la boutique {store_id}: {req.customer_name} ({req.total_amount} DZD)")
        return {"success": True, "order": res.data[0]}
    except Exception as e:
        logger.error(f"Erreur insertion commande: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
@router.get("/")
async def get_orders(store_id: Optional[str] = None, supabase = Depends(get_supabase)):
    try:
        query = supabase.table("orders").select("*").order("created_at", desc=True)
        if store_id:
            query = query.eq("store_id", store_id)
        res = query.execute()
        return {"success": True, "orders": res.data or []}
    except Exception as e:
        logger.error(f"Erreur lecture commandes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
