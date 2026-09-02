"""
Routes analytics — /analytics

GET  /analytics/{store_id}?period=7d   — Dashboard data agrégé
POST /analytics/track                   — Tracking event (non-bloquant)
GET  /analytics/{store_id}/export       — Export CSV
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from dependencies import get_current_user, get_supabase_client

logger = logging.getLogger("storegen.analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics"])

# ─── Types ────────────────────────────────────────────────────────────────────

Period = Literal["today", "7d", "30d", "3m"]

PERIOD_DAYS: dict[str, int] = {
    "today": 1,
    "7d":    7,
    "30d":   30,
    "3m":    90,
}

# ─── Tracking model ───────────────────────────────────────────────────────────

class TrackEvent(BaseModel):
    store_id:   str
    event_type: Literal["view", "whatsapp_click", "product_view", "order"]
    product_id: str | None = None
    source:     str | None = "direct"
    metadata:   dict      = Field(default_factory=dict)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def period_range(period: Period) -> tuple[datetime, datetime, datetime]:
    """Returns (start, end, prev_start) in UTC."""
    now   = datetime.now(timezone.utc)
    days  = PERIOD_DAYS[period]
    end   = now
    start = now - timedelta(days=days)
    prev  = start - timedelta(days=days)
    return start, end, prev


async def verify_store_owner(store_id: str, user_id: str, sb) -> None:
    res = sb.table("stores").select("owner_id").eq("id", store_id).single().execute()
    if not res.data or res.data["owner_id"] != user_id:
        raise HTTPException(403, "Accès refusé")


# ─── GET /analytics/{store_id} ────────────────────────────────────────────────

@router.get("/{store_id}")
async def get_analytics(
    store_id: str,
    period: Period = Query("7d"),
    user=Depends(get_current_user),
    sb=Depends(get_supabase_client),
):
    await verify_store_owner(store_id, user.id, sb)

    start, end, prev_start = period_range(period)

    # ── 1. Events current period ──────────────────────────────────────────────
    events_res = (
        sb.table("store_analytics")
        .select("event_type, product_id, metadata, created_at")
        .eq("store_id", store_id)
        .gte("created_at", start.isoformat())
        .lte("created_at", end.isoformat())
        .execute()
    )
    events: list[dict] = events_res.data or []

    # ── 2. Events previous period ─────────────────────────────────────────────
    prev_res = (
        sb.table("store_analytics")
        .select("event_type")
        .eq("store_id", store_id)
        .gte("created_at", prev_start.isoformat())
        .lt("created_at", start.isoformat())
        .execute()
    )
    prev_events: list[dict] = prev_res.data or []

    # ── 3. Orders ─────────────────────────────────────────────────────────────
    orders_res = (
        sb.table("orders")
        .select("id, created_at, customer_name, items, total_amount, status")
        .eq("store_id", store_id)
        .gte("created_at", start.isoformat())
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    orders: list[dict] = orders_res.data or []

    # ── 4. Products (for name lookup) ─────────────────────────────────────────
    products_res = (
        sb.table("products")
        .select("id, name, images")
        .eq("store_id", store_id)
        .execute()
    )
    products_map: dict[str, dict] = {
        p["id"]: p for p in (products_res.data or [])
    }

    # ── 5. Aggregate KPIs ─────────────────────────────────────────────────────
    views             = sum(1 for e in events if e["event_type"] == "view")
    wa_clicks         = sum(1 for e in events if e["event_type"] == "whatsapp_click")
    conversion_rate   = round(wa_clicks / views * 100, 1) if views > 0 else 0.0
    confirmed_orders  = sum(1 for o in orders if o["status"] == "confirmed")

    prev_views        = sum(1 for e in prev_events if e["event_type"] == "view")
    prev_wa           = sum(1 for e in prev_events if e["event_type"] == "whatsapp_click")
    prev_conversion   = round(prev_wa / prev_views * 100, 1) if prev_views > 0 else 0.0
    prev_confirmed    = 0  # quick — add prev orders query if needed

    # ── 6. Daily views ────────────────────────────────────────────────────────
    days = PERIOD_DAYS[period]
    daily_map: dict[str, int] = {}
    for e in events:
        if e["event_type"] == "view":
            day = e["created_at"][:10]
            daily_map[day] = daily_map.get(day, 0) + 1

    daily_views = []
    for i in range(days):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        label = (start + timedelta(days=i)).strftime("%d/%m")
        daily_views.append({"date": label, "views": daily_map.get(day, 0)})

    # ── 7. Top products ───────────────────────────────────────────────────────
    product_view_counts: dict[str, int] = {}
    for e in events:
        if e["event_type"] == "product_view" and e.get("product_id"):
            pid = e["product_id"]
            product_view_counts[pid] = product_view_counts.get(pid, 0) + 1

    top_products = sorted(
        [
            {
                "product_id": pid,
                "name":       products_map.get(pid, {}).get("name", "Produit supprimé"),
                "views":      cnt,
                "image":      (products_map.get(pid, {}).get("images") or [None])[0],
            }
            for pid, cnt in product_view_counts.items()
        ],
        key=lambda x: x["views"],
        reverse=True,
    )[:8]

    # ── 8. Traffic sources ────────────────────────────────────────────────────
    source_map: dict[str, int] = {}
    for e in events:
        if e["event_type"] == "view":
            src = (e.get("metadata") or {}).get("source", "Direct")
            source_map[src] = source_map.get(src, 0) + 1

    # Ensure all 4 buckets exist
    for bucket in ("Direct", "WhatsApp", "Facebook", "Autre"):
        source_map.setdefault(bucket, 0)

    traffic_sources = [
        {"source": k, "count": v}
        for k, v in sorted(source_map.items(), key=lambda x: -x[1])
    ]

    # ── 9. Format orders ──────────────────────────────────────────────────────
    recent_orders = [
        {
            "id":            o["id"],
            "created_at":    o["created_at"],
            "customer_name": o.get("customer_name", "—"),
            "items":         _parse_items(o.get("items")),
            "total_amount":  o.get("total_amount", 0),
            "status":        o.get("status", "pending"),
        }
        for o in orders[:20]
    ]

    return {
        "store_id": store_id,
        "period":   period,
        "kpi": {
            "views":                    views,
            "views_prev":               prev_views,
            "whatsapp_clicks":          wa_clicks,
            "whatsapp_clicks_prev":     prev_wa,
            "conversion_rate":          conversion_rate,
            "conversion_rate_prev":     prev_conversion,
            "confirmed_orders":         confirmed_orders,
            "confirmed_orders_prev":    prev_confirmed,
        },
        "daily_views":     daily_views,
        "top_products":    top_products,
        "traffic_sources": traffic_sources,
        "recent_orders":   recent_orders,
    }


# ─── POST /analytics/track ────────────────────────────────────────────────────

@router.post("/track")
async def track_event(
    event: TrackEvent,
    sb=Depends(get_supabase_client),
):
    """Non-blocking event tracking — called from store frontend with fetch keepalive."""
    try:
        sb.table("store_analytics").insert({
            "store_id":   event.store_id,
            "event_type": event.event_type,
            "product_id": event.product_id,
            "metadata":   {
                "source": event.source,
                **event.metadata,
            },
        }).execute()
    except Exception as exc:
        # Never block the client — just log
        logger.warning(f"Track event failed silently: {exc}")

    return {"ok": True}


# ─── GET /analytics/{store_id}/export ────────────────────────────────────────

@router.get("/{store_id}/export")
async def export_analytics_csv(
    store_id: str,
    period: Period = Query("30d"),
    user=Depends(get_current_user),
    sb=Depends(get_supabase_client),
):
    await verify_store_owner(store_id, user.id, sb)
    start, end, _ = period_range(period)

    orders_res = (
        sb.table("orders")
        .select("id, created_at, customer_name, customer_phone, items, total_amount, status")
        .eq("store_id", store_id)
        .gte("created_at", start.isoformat())
        .order("created_at", desc=True)
        .execute()
    )
    orders = orders_res.data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Client", "Téléphone", "Produits", "Total (DZD)", "Statut"])

    for o in orders:
        items_str = " | ".join(
            f"{i.get('qty',1)}x {i.get('name','?')}" for i in _parse_items(o.get("items"))
        )
        writer.writerow([
            o["id"][:8],
            o["created_at"][:16].replace("T", " "),
            o.get("customer_name", ""),
            o.get("customer_phone", ""),
            items_str,
            o.get("total_amount", 0),
            o.get("status", ""),
        ])

    output.seek(0)
    filename = f"commandes_{store_id[:8]}_{period}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_items(raw) -> list[dict]:
    """Normalize items — handles list[dict] or stringified JSON."""
    if not raw:
        return []
    if isinstance(raw, list):
        return [{"name": i.get("name", "?"), "qty": i.get("quantity", i.get("qty", 1))} for i in raw]
    if isinstance(raw, str):
        try:
            import json
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [{"name": i.get("name", "?"), "qty": i.get("quantity", i.get("qty", 1))} for i in parsed]
        except Exception:
            pass
    return []
