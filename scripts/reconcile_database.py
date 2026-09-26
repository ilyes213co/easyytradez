"""
Database Reconciliation Script for StoreGen Shopify Clone
=========================================================

Purpose:
  Detect and fix data inconsistencies in the Supabase database after
  direct inserts or API-driven product additions.

Tables checked:
  - profiles
  - stores
  - products
  - orders
  - store_analytics
  - generation_jobs
  - deploy_jobs

Usage:
  1. Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in api/.env
  2. Run: python scripts/reconcile_database.py --dry-run   (preview only)
  3. Run: python scripts/reconcile_database.py --apply      (apply fixes)

Environment:
  SUPABASE_URL            - Supabase project URL
  SUPABASE_SERVICE_KEY    - Supabase service role key (server-side)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Paths & env
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
API_DIR = BASE_DIR / "api"

load_dotenv(API_DIR / ".env")
if not (API_DIR / ".env").exists():
    load_dotenv(API_DIR / ".env.txt")
load_dotenv(BASE_DIR / ".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print(
        "ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.\n"
        "Please set them in api/.env or api/.env.txt before running this script.",
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("reconcile")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def slugify(text: str) -> str:
    """Mirror of api/routes/stores.py slugify for consistency."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "boutique"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------


@dataclass
class Issue:
    category: str
    table: str
    record_id: str
    field: str
    description: str
    severity: str  # "error" | "warning" | "info"
    fix_sql: Optional[str] = None


@dataclass
class ReconciliationReport:
    issues: list[Issue] = field(default_factory=list)
    stats: dict[str, int] = field(default_factory=dict)

    def add(self, issue: Issue):
        self.issues.append(issue)
        self.stats[issue.severity] = self.stats.get(issue.severity, 0) + 1

    def summary(self) -> str:
        lines = [
            "=" * 60,
            "RECONCILIATION REPORT",
            "=" * 60,
            f"Total issues found : {len(self.issues)}",
            f"  Errors   : {self.stats.get('error', 0)}",
            f"  Warnings : {self.stats.get('warning', 0)}",
            f"  Info     : {self.stats.get('info', 0)}",
            "-" * 60,
        ]
        if not self.issues:
            lines.append("No issues found. Database is clean.")
        else:
            for i, issue in enumerate(self.issues, 1):
                lines.append(
                    f"{i:3}. [{issue.severity.upper():7}] "
                    f"{issue.table}.{issue.field} "
                    f"(id={issue.record_id[:8] if issue.record_id else '?'}…)"
                )
                lines.append(f"       {issue.description}")
        lines.append("=" * 60)
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Reconciliation checks
# ---------------------------------------------------------------------------


class DatabaseReconciler:
    def __init__(self, sb: Client, dry_run: bool = True):
        self.sb = sb
        self.dry_run = dry_run
        self.report = ReconciliationReport()
        self._fixes_applied = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self) -> ReconciliationReport:
        logger.info("Starting database reconciliation (dry_run=%s)...", self.dry_run)
        self._check_profiles()
        self._check_stores()
        self._check_products()
        self._check_orders()
        self._check_store_analytics()
        self._check_generation_jobs()
        self._check_deploy_jobs()
        logger.info(
            "Reconciliation complete. Found %d issues (%d fixes %s).",
            len(self.report.issues),
            self._fixes_applied,
            "previewed" if self.dry_run else "applied",
        )
        return self.report

    # ------------------------------------------------------------------
    # Profiles
    # ------------------------------------------------------------------

    def _check_profiles(self):
        logger.info("Checking profiles...")
        try:
            res = (
                self.sb.table("profiles")
                .select("id, full_name, plan, created_at")
                .execute()
            )
            profiles = res.data or []
            profile_ids = {p["id"] for p in profiles}
        except Exception as exc:
            logger.error("Failed to fetch profiles: %s", exc)
            return

        # Check that all store owners have a profile
        try:
            stores_res = (
                self.sb.table("stores")
                .select("id, owner_id, name")
                .execute()
            )
            stores = stores_res.data or []
        except Exception as exc:
            logger.error("Failed to fetch stores for profile check: %s", exc)
            return

        for store in stores:
            oid = store.get("owner_id")
            if not oid:
                self.report.add(
                    Issue(
                        category="integrity",
                        table="stores",
                        record_id=store["id"],
                        field="owner_id",
                        description="Store has no owner_id. Cannot verify ownership.",
                        severity="error",
                    )
                )
            elif oid not in profile_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="stores",
                        record_id=store["id"],
                        field="owner_id",
                        description=f"Store owner_id '{oid}' does not match any profile.id. "
                                    "This will cause 403 errors on all product operations.",
                        severity="error",
                    )
                )

        for p in profiles:
            self.report.add(
                Issue(
                    category="orphan",
                    table="profiles",
                    record_id=p["id"],
                    field="id",
                    description="Profile record exists. Verify auth.users(id) matches.",
                    severity="info",
                )
            )

    # ------------------------------------------------------------------
    # Stores
    # ------------------------------------------------------------------

    def _check_stores(self):
        logger.info("Checking stores...")
        try:
            res = (
                self.sb.table("stores")
                .select(
                    "id, owner_id, name, slug, status, "
                    "primary_color, font_family, theme, animation_style, "
                    "special_effects, category, currency, city, country, "
                    "seo_title, seo_description, slogan, "
                    "vercel_project_id, subdomain, published_url, "
                    "github_repo, generated_html, "
                    "created_at, updated_at"
                )
                .execute()
            )
            stores = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch stores: %s", exc)
            return

        store_ids = {s["id"] for s in stores}

        for store in stores:
            sid = store["id"]
            oid = store.get("owner_id")

            # Missing owner_id
            if not oid:
                self.report.add(
                    Issue(
                        category="integrity",
                        table="stores",
                        record_id=sid,
                        field="owner_id",
                        description="Store has no owner_id. Cannot verify ownership.",
                        severity="error",
                    )
                )

            # Missing slug
            if not store.get("slug"):
                new_slug = slugify(store.get("name", "boutique"))
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="stores",
                        record_id=sid,
                        field="slug",
                        description=f"Store missing slug. Suggested: {new_slug}",
                        severity="warning",
                        fix_sql=(
                            f"UPDATE public.stores SET slug = '{new_slug}' "
                            f"WHERE id = '{sid}' AND slug IS NULL;"
                            if self.dry_run
                            else None
                        ),
                    )
                )
                if not self.dry_run:
                    self._safe_update(
                        "stores", sid, {"slug": new_slug, "updated_at": _utc_now()}
                    )
                    self._fixes_applied += 1

            # Invalid status
            valid_statuses = (
                "draft",
                "generating",
                "generated",
                "published",
                "inactive",
                "suspended",
            )
            if store.get("status") not in valid_statuses:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="stores",
                        record_id=sid,
                        field="status",
                        description=f"Invalid status '{store.get('status')}'. "
                                    f"Expected one of {valid_statuses}.",
                        severity="warning",
                    )
                )

            # Null special_effects
            if store.get("special_effects") is None:
                if not self.dry_run:
                    self._safe_update(
                        "stores",
                        sid,
                        {"special_effects": [], "updated_at": _utc_now()},
                    )
                    self._fixes_applied += 1
                else:
                    self.report.add(
                        Issue(
                            category="null_field",
                            table="stores",
                            record_id=sid,
                            field="special_effects",
                            description="special_effects is NULL, should be [].",
                            severity="warning",
                        )
                    )

            # Missing seo_title / seo_description
            if not store.get("seo_title"):
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="stores",
                        record_id=sid,
                        field="seo_title",
                        description="Store missing seo_title.",
                        severity="info",
                    )
                )

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    def _check_products(self):
        logger.info("Checking products...")
        try:
            res = (
                self.sb.table("products")
                .select(
                    "id, store_id, name, slug, price, original_price, "
                    "stock_quantity, status, position, images, "
                    "is_featured, category, created_at, updated_at"
                )
                .execute()
            )
            products = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch products: %s", exc)
            return

        # Group products by store for position checks
        by_store: dict[str, list[dict]] = {}
        for p in products:
            sid = p.get("store_id")
            if sid:
                by_store.setdefault(sid, []).append(p)

        for p in products:
            pid = p["id"]
            sid = p.get("store_id")

            # Orphaned product (store doesn't exist)
            if not sid or sid not in by_store and sid:
                # Double-check against stores table
                store_exists = self._exists("stores", sid)
                if not store_exists:
                    self.report.add(
                        Issue(
                            category="orphan",
                            table="products",
                            record_id=pid,
                            field="store_id",
                            description=f"Product references non-existent store '{sid}'.",
                            severity="error",
                        )
                    )

            # Missing name
            if not p.get("name"):
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="products",
                        record_id=pid,
                        field="name",
                        description="Product has empty or NULL name.",
                        severity="error",
                    )
                )

            # Missing slug
            if not p.get("slug"):
                suggested = slugify(p.get("name", "produit"))
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="products",
                        record_id=pid,
                        field="slug",
                        description=f"Product missing slug. Suggested: {suggested}",
                        severity="warning",
                    )
                )
                if not self.dry_run:
                    self._safe_update(
                        "products", pid, {"slug": suggested, "updated_at": _utc_now()}
                    )
                    self._fixes_applied += 1

            # Invalid price
            price = p.get("price")
            if price is None or float(price) <= 0:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="products",
                        record_id=pid,
                        field="price",
                        description=f"Invalid price: {price}. Must be > 0.",
                        severity="error",
                    )
                )

            # original_price <= price
            op = p.get("original_price")
            if op is not None and price is not None:
                if float(op) <= float(price):
                    self.report.add(
                        Issue(
                            category="invalid_value",
                            table="products",
                            record_id=pid,
                            field="original_price",
                            description=f"original_price ({op}) must be > price ({price}).",
                            severity="warning",
                        )
                    )

            # Invalid status
            valid_statuses = ("active", "draft", "archived")
            if p.get("status") not in valid_statuses:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="products",
                        record_id=pid,
                        field="status",
                        description=f"Invalid status '{p.get('status')}'. "
                                    f"Expected one of {valid_statuses}.",
                        severity="warning",
                    )
                )
                if not self.dry_run:
                    self._safe_update(
                        "products",
                        pid,
                        {"status": "active", "updated_at": _utc_now()},
                    )
                    self._fixes_applied += 1

            # Invalid images format
            images = p.get("images")
            if images is None:
                if not self.dry_run:
                    self._safe_update(
                        "products",
                        pid,
                        {"images": [], "updated_at": _utc_now()},
                    )
                    self._fixes_applied += 1
                else:
                    self.report.add(
                        Issue(
                            category="null_field",
                            table="products",
                            record_id=pid,
                            field="images",
                            description="images is NULL, should be [].",
                            severity="warning",
                        )
                    )
            elif not isinstance(images, list):
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="products",
                        record_id=pid,
                        field="images",
                        description=f"images is not a JSON array: {type(images).__name__}.",
                        severity="error",
                    )
                )

            # Null stock_quantity
            if p.get("stock_quantity") is None:
                if not self.dry_run:
                    self._safe_update(
                        "products",
                        pid,
                        {"stock_quantity": 0, "updated_at": _utc_now()},
                    )
                    self._fixes_applied += 1
                else:
                    self.report.add(
                        Issue(
                            category="null_field",
                            table="products",
                            record_id=pid,
                            field="stock_quantity",
                            description="stock_quantity is NULL, default is 0.",
                            severity="warning",
                        )
                    )

        # Position checks per store
        for sid, store_products in by_store.items():
            if not sid:
                continue
            positions = [sp.get("position", 0) for sp in store_products]
            unique_positions = set(positions)

            # Duplicate positions
            if len(positions) != len(unique_positions):
                dupes = [
                    pos for pos in positions if positions.count(pos) > 1
                ]
                self.report.add(
                    Issue(
                        category="duplicate",
                        table="products",
                        record_id=sid,
                        field="position",
                        description=f"Duplicate positions found in store: {sorted(set(dupes))}.",
                        severity="warning",
                    )
                )
                if not self.dry_run:
                    self._fix_positions(sid, store_products)
                    self._fixes_applied += 1

            # Duplicate slugs within same store
            slug_counts: dict[str, list[str]] = {}
            for sp in store_products:
                s = sp.get("slug")
                if s:
                    slug_counts.setdefault(s, []).append(sp["id"])
            for slug, pids in slug_counts.items():
                if len(pids) > 1:
                    self.report.add(
                        Issue(
                            category="duplicate",
                            table="products",
                            record_id=", ".join(pids),
                            field="slug",
                            description=f"Duplicate slug '{slug}' in store {sid[:8]}… "
                                        f"affects {len(pids)} products. "
                                        f"Unique constraint violation risk.",
                            severity="error",
                        )
                    )

        # Legacy column check: compare_price should have been migrated to original_price
        try:
            legacy_res = (
                self.sb.table("products")
                .select("id")
                .filter("compare_price", "not.is", "null")
                .execute()
            )
            legacy_rows = legacy_res.data or []
            for row in legacy_rows:
                self.report.add(
                    Issue(
                        category="legacy_column",
                        table="products",
                        record_id=row["id"],
                        field="compare_price",
                        description="Product still uses legacy 'compare_price' column. "
                                    "Run migration_stores.sql to rename to original_price.",
                        severity="warning",
                    )
                )
        except Exception:
            # Column doesn't exist — that's fine, migration already ran
            pass

    # ------------------------------------------------------------------
    # Orders
    # ------------------------------------------------------------------

    def _check_orders(self):
        logger.info("Checking orders...")
        try:
            res = (
                self.sb.table("orders")
                .select("id, store_id, customer_name, status, total_amount, items")
                .execute()
            )
            orders = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch orders: %s", exc)
            return

        store_ids = {
            row["id"]
            for row in self.sb.table("stores").select("id").execute().data or []
        }

        for order in orders:
            oid = order["id"]
            sid = order.get("store_id")

            if not sid or sid not in store_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="orders",
                        record_id=oid,
                        field="store_id",
                        description=f"Order references non-existent store '{sid}'.",
                        severity="error",
                    )
                )

            # Invalid status
            valid_statuses = (
                "pending", "confirmed", "shipped", "delivered", "cancelled"
            )
            if order.get("status") not in valid_statuses:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="orders",
                        record_id=oid,
                        field="status",
                        description=f"Invalid status '{order.get('status')}'.",
                        severity="warning",
                    )
                )

            # Invalid total_amount
            total = order.get("total_amount")
            if total is None or float(total) < 0:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="orders",
                        record_id=oid,
                        field="total_amount",
                        description=f"Invalid total_amount: {total}.",
                        severity="warning",
                    )
                )

    # ------------------------------------------------------------------
    # Store Analytics
    # ------------------------------------------------------------------

    def _check_store_analytics(self):
        logger.info("Checking store_analytics...")
        try:
            res = (
                self.sb.table("store_analytics")
                .select("id, store_id, product_id, event_type, metadata, created_at")
                .execute()
            )
            events = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch store_analytics: %s", exc)
            return

        store_ids = {
            row["id"]
            for row in self.sb.table("stores").select("id").execute().data or []
        }
        product_ids = {
            row["id"]
            for row in self.sb.table("products").select("id").execute().data or []
        }

        for event in events:
            eid = event["id"]
            sid = event.get("store_id")
            pid = event.get("product_id")

            if not sid or sid not in store_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="store_analytics",
                        record_id=eid,
                        field="store_id",
                        description=f"Analytics event references non-existent store '{sid}'.",
                        severity="error",
                    )
                )

            if pid and pid not in product_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="store_analytics",
                        record_id=eid,
                        field="product_id",
                        description=f"Analytics event references non-existent product '{pid}'.",
                        severity="warning",
                    )
                )

            # Missing event_type
            if not event.get("event_type"):
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="store_analytics",
                        record_id=eid,
                        field="event_type",
                        description="Analytics event missing event_type.",
                        severity="warning",
                    )
                )

    # ------------------------------------------------------------------
    # Generation Jobs
    # ------------------------------------------------------------------

    def _check_generation_jobs(self):
        logger.info("Checking generation_jobs...")
        try:
            res = (
                self.sb.table("generation_jobs")
                .select("id, store_id, user_id, status, progress, created_at")
                .execute()
            )
            jobs = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch generation_jobs: %s", exc)
            return

        store_ids = {
            row["id"]
            for row in self.sb.table("stores").select("id").execute().data or []
        }

        for job in jobs:
            jid = job["id"]
            sid = job.get("store_id")
            uid = job.get("user_id")

            if not sid or sid not in store_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="generation_jobs",
                        record_id=jid,
                        field="store_id",
                        description=f"Job references non-existent store '{sid}'.",
                        severity="error",
                    )
                )

            if not uid:
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="generation_jobs",
                        record_id=jid,
                        field="user_id",
                        description="Job missing user_id.",
                        severity="warning",
                    )
                )

            # Invalid status
            valid_statuses = (
                "pending", "generating", "pushing", "deploying",
                "configuring", "ready", "error",
            )
            if job.get("status") not in valid_statuses:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="generation_jobs",
                        record_id=jid,
                        field="status",
                        description=f"Invalid status '{job.get('status')}'.",
                        severity="warning",
                    )
                )

    # ------------------------------------------------------------------
    # Deploy Jobs
    # ------------------------------------------------------------------

    def _check_deploy_jobs(self):
        logger.info("Checking deploy_jobs...")
        try:
            res = (
                self.sb.table("deploy_jobs")
                .select("id, store_id, user_id, status, url, error, created_at")
                .execute()
            )
            jobs = res.data or []
        except Exception as exc:
            logger.error("Failed to fetch deploy_jobs: %s", exc)
            return

        store_ids = {
            row["id"]
            for row in self.sb.table("stores").select("id").execute().data or []
        }

        for job in jobs:
            jid = job["id"]
            sid = job.get("store_id")
            uid = job.get("user_id")

            if not sid or sid not in store_ids:
                self.report.add(
                    Issue(
                        category="orphan",
                        table="deploy_jobs",
                        record_id=jid,
                        field="store_id",
                        description=f"Deploy job references non-existent store '{sid}'.",
                        severity="error",
                    )
                )

            if not uid:
                self.report.add(
                    Issue(
                        category="missing_field",
                        table="deploy_jobs",
                        record_id=jid,
                        field="user_id",
                        description="Deploy job missing user_id.",
                        severity="warning",
                    )
                )

            # Invalid status
            valid_statuses = (
                "pending", "generating", "pushing", "deploying",
                "configuring", "ready", "error",
            )
            if job.get("status") not in valid_statuses:
                self.report.add(
                    Issue(
                        category="invalid_value",
                        table="deploy_jobs",
                        record_id=jid,
                        field="status",
                        description=f"Invalid status '{job.get('status')}'.",
                        severity="warning",
                    )
                )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _exists(self, table: str, record_id: str) -> bool:
        try:
            res = (
                self.sb.table(table)
                .select("id")
                .eq("id", record_id)
                .execute()
            )
            return bool(res.data)
        except Exception:
            return False

    def _safe_update(self, table: str, record_id: str, data: dict):
        try:
            (
                self.sb.table(table)
                .update(data)
                .eq("id", record_id)
                .execute()
            )
            logger.info("Updated %s id=%s with %s", table, record_id[:8], data)
        except Exception as exc:
            logger.error(
                "Failed to update %s id=%s: %s", table, record_id[:8], exc
            )

    def _fix_positions(self, store_id: str, products: list[dict]):
        """Reassign sequential positions (0, 1, 2, ...) for a store's products."""
        sorted_products = sorted(products, key=lambda p: p.get("created_at", ""))
        for idx, p in enumerate(sorted_products):
            self._safe_update(
                "products",
                p["id"],
                {"position": idx, "updated_at": _utc_now()},
            )
        logger.info(
            "Reassigned positions for %d products in store %s",
            len(sorted_products),
            store_id[:8],
        )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Reconcile StoreGen database after product insertions."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply fixes automatically (default: dry-run)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output report as JSON instead of text",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Write report to file (optional)",
    )
    args = parser.parse_args()

    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    reconciler = DatabaseReconciler(sb=sb, dry_run=not args.apply)
    report = reconciler.run()

    # Output
    if args.json:
        output = json.dumps(
            {
                "summary": {
                    "total": len(report.issues),
                    "errors": report.stats.get("error", 0),
                    "warnings": report.stats.get("warning", 0),
                    "info": report.stats.get("info", 0),
                },
                "issues": [
                    {
                        "category": i.category,
                        "table": i.table,
                        "record_id": i.record_id,
                        "field": i.field,
                        "description": i.description,
                        "severity": i.severity,
                        "fix_sql": i.fix_sql,
                    }
                    for i in report.issues
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
    else:
        output = report.summary()

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        logger.info("Report written to %s", args.output)
    else:
        print(output)

    # Exit code: 0 = clean, 1 = issues found
    sys.exit(1 if report.issues else 0)


if __name__ == "__main__":
    main()
