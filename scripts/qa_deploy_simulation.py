"""
QA — Deployment pipeline simulation (offline).

Reproduces the code paths hit by `POST /deploy/{store_id}` and
`POST /deploy/{store_id}/redeploy` WITHOUT network — HTTP is fully mocked
(httpx.AsyncClient patched) while the REAL generator + REAL deployer logic run.

Catches the regressions that only surface AFTER the user clicks
"Publier la boutique" / "Mettre à jour":
  * exceptions inside _get_fallback_template   → bare-page deploys
  * invalid JS inside the inline <script> blobs → whole storefront dead
  * invalid vercel.json / non-serializable deployment payload
  * leftover {{tokens}} shipped to production
  * analytics tracker tokens ({{store_id}}/{{api_url}}) lost in prod
  * asset loading (storefront.js / modern.css) breaking the payload

Usage: python scripts/qa_deploy_simulation.py
"""

import asyncio
import json
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api"))

from services import ai_generator, deployer  # noqa: E402

FAILURES = []


def check(name, cond, detail=""):
    if not cond:
        FAILURES.append(name)
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"  — {detail}" if detail and not cond else ""))


# ── Realistic Supabase-shaped rows: NULL columns are Python `None`, and a few
#    values are deliberately hostile (emoji, apostrophes, HTML, formatted price).
STORE_ROW = {
    "id": "cf05c2c6-5bcd-4e01-98c9-210808533914",
    "owner_id": "e86f1182-d443-4cd2-a8d4-bed86fbc1584",
    "name": "Cake me away",
    "description": None,
    "slug": "cake-me-away",
    "primary_color": None,
    "whatsapp_phone": "+213 555 12 34 56",
    "theme": None,
    "animation_style": None,
    "font_family": "Inter",
    "special_effects": [],
    "status": "draft",
    "logo_url": None,
    "api_url": None,
    "vercel_project_id": None,
    "published_url": None,
}

PRODUCT_ROWS = [
    {
        "id": "a1b2c3d4-e5f6-4a5b-9c8d-111111111111",
        "store_id": STORE_ROW["id"],
        "name": "Gâteau au chocolat 🍫",
        "description": "Moelleux chocolat noir 70% — commandez aujourd'hui !",
        "price": "3500",
        "original_price": 4200,
        "category": "Gâteaux",
        "is_featured": True,
        "stock_quantity": 12,
        "position": 1,
        "images": [{"url": "https://img.example.com/cake1.jpg"}],
    },
    {
        "id": "b2c3d4e5-f6a7-4b5c-9d8e-222222222222",
        "store_id": STORE_ROW["id"],
        "name": "Cupcakes vanille",
        "description": None,
        "price": 900.50,
        "original_price": None,
        "category": None,
        "is_featured": False,
        "stock_quantity": 30,
        "position": 2,
        "images": [],
    },
    {
        "id": None,
        "store_id": STORE_ROW["id"],
        "name": "Macarons",
        "description": "</script><script>window.__xss__=1</script>",
        "price": 1800,
        "original_price": 2200,
        "category": "Desserts",
        "is_featured": False,
        "stock_quantity": 0,
        "position": 3,
        "images": [None],
    },
]


class FakeResponse:
    def __init__(self, status_code=200, json=None, text=""):
        self.status_code = status_code
        self._json = json if json is not None else {}
        self.text = text

    def json(self):
        return self._json


class FakeAsyncClient:
    """Records requests; answers the Vercel + GitHub calls the pipeline makes."""

    def __init__(self, *a, **k):
        self.requests = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def request(self, method, url, **kwargs):
        self.requests.append((method, url, kwargs))
        path = url.replace("https://", "")
        low = path.lower()

        if low.startswith("api.github.com/repos/") and method.lower() == "get":
            return FakeResponse(404)
        if low.startswith("api.github.com/orgs/") or low.startswith("api.github.com/user/repos"):
            return FakeResponse(201, {"id": 1})
        if "api.github.com/repos/" in low and "/contents/" in low:
            return FakeResponse(200, {"content": {"sha": "abc"}})
        if low.startswith("api.vercel.com/v9/projects/"):
            return FakeResponse(200, {"id": "prj_x"})
        if low.startswith("api.vercel.com/v10/projects"):
            return FakeResponse(200, {"id": "prj_x"})
        if low.startswith("api.vercel.com/v13/deployments") and method.lower() == "get":
            return FakeResponse(200, {"readyState": "READY", "status": "READY", "url": "https://cake-me-away.vercel.app"})
        if low.startswith("api.vercel.com/v13/deployments"):
            if "gitSource" in kwargs.get("json", {}):
                return FakeResponse(400, {"error": "gitSource not available"})
            return FakeResponse(200, {"id": "dpl_x"})
        raise AssertionError(f"Unexpected request: {method} {url}")

    async def get(self, url, **kw):  return await self.request("GET", url, **kw)
    async def post(self, url, **kw): return await self.request("POST", url, **kw)
    async def put(self, url, **kw):  return await self.request("PUT", url, **kw)
    async def patch(self, url, **kw): return await self.request("PATCH", url, **kw)


class _FakeSupabase:
    def __init__(self, row):
        self._row = row

    def table(self, name):
        return _FakeTable(self._row)


class _FakeTable:
    def __init__(self, row):
        self._row = row

    def select(self, *a): return self
    def eq(self, *a): return self
    def single(self): return self
    def execute(self): return _FakeResult(self._row)
    def update(self, *a, **k): return self


class _FakeResult:
    def __init__(self, row):
        self.data = row
def capture_deploy_upload(client):
    """Find the final v13/deployments POST (the real deploy payload)."""
    for method, url, kwargs in client.requests:
        if method.upper() == "POST" and "/v13/deployments" in url:
            payload = kwargs.get("json", {})
            if "files" in payload:
                return payload
    return None


def main():
    print("== 1. Fallback template with hostile/realistic data ==")
    gen = ai_generator.AIStoreGenerator()
    html = gen._get_fallback_template(STORE_ROW, PRODUCT_ROWS)
    leftover = re.findall(r"\{\{\s*[a-zA-Z0-9_]+\s*\}\}", html)
    check("no raw {{tokens}} reach production", not leftover, str(leftover[:2]))

    check("default primary applied for NULL color", "#534AB7" in html)
    check("no raw </script><script> breakout from data", "</script><script>" not in html)
    check("NULL product id falls back to index", '"id": "2"' in html)
    check("out-of-stock never blocks a sale", '"stock_quantity": 1' in html)

    m_store = re.search(r"window\.STORE_DATA\s*=\s*(\{.*?\});", html, re.S)
    m_prods = re.search(r"window\.PRODUCTS_DATA\s*=\s*(\[.*?\]);", html, re.S)
    check("STORE_DATA blob present", bool(m_store))
    check("PRODUCTS_DATA blob present", bool(m_prods))
    if m_prods:
        try:
            json.loads(m_prods.group(1))
            check("PRODUCTS_DATA is valid JSON", True)
        except Exception as e:
            check("PRODUCTS_DATA is valid JSON", False, str(e))

    print("== 2. Analytics tracker tokens ==")
    check("{{store_id}} replaced", "{{store_id}}" not in html)
    check("{{api_url}} replaced", "{{api_url}}" not in html)
    m_id = re.search(r'var\s+STORE_ID\s*=\s*"([^"]*)"', html)
    check("tracker STORE_ID has a real value", bool(m_id) and m_id.group(1) == STORE_ROW["id"],
          repr(m_id.group(1)) if m_id else "no match")

    print("== 3. Full pipeline (deploy_store) with mocked HTTP ==")
    original_client = deployer.httpx.AsyncClient
    original_supabase = deployer.get_supabase
    original_guard = deployer.StoreDeployer._ensure_required_tokens
    original_owner = (deployer.GITHUB_OWNER, deployer.GITHUB_ORG)
    original_sleep = asyncio.sleep

    async def _no_sleep(*a, **k):
        pass

    asyncio.sleep = _no_sleep
    fake_client = FakeAsyncClient()
    deployer.httpx.AsyncClient = lambda *a, **k: fake_client
    deployer.get_supabase = lambda: _FakeSupabase(STORE_ROW)
    deployer.StoreDeployer._ensure_required_tokens = staticmethod(lambda: None)
    deployer.GITHUB_OWNER = "testowner"
    deployer.GITHUB_ORG = ""
    try:
        result = asyncio.run(deployer.StoreDeployer().deploy_store(STORE_ROW["id"], html, {}))
        check("deploy_store returned a URL", bool(result.get("url")))

        payload = capture_deploy_upload(fake_client)
        check("upload deployment payload exists", payload is not None)
        if payload:
            files = {f["file"]: f["data"] for f in payload["files"]}
            for name in ("index.html", "storefront.js", "storefront-modern.css", "vercel.json"):
                check(f"payload includes {name}", name in files)
            try:
                json.loads(files["vercel.json"])
                check("vercel.json is valid JSON", True)
            except Exception as e:
                check("vercel.json is valid JSON", False, str(e))
            check("payload JSON-serializable", bool(json.dumps(payload)))

        gh_puts = {r[1].rsplit("/", 1)[-1] for r in fake_client.requests
                   if r[0].upper() == "PUT" and "/contents/" in r[1]}
        check("GitHub push includes storefront.js", "storefront.js" in gh_puts, str(gh_puts))
        check("GitHub push includes modern.css", "storefront-modern.css" in gh_puts, str(gh_puts))
    finally:
        asyncio.sleep = original_sleep
        deployer.httpx.AsyncClient = original_client
        deployer.get_supabase = original_supabase
        deployer.StoreDeployer._ensure_required_tokens = original_guard
        deployer.GITHUB_OWNER, deployer.GITHUB_ORG = original_owner

    print()
    if FAILURES:
        print("FAILED:", ", ".join(FAILURES))
        sys.exit(1)
    print("ALL DEPLOY SIMULATION CHECKS PASSED ✅")
    sys.exit(0)


if __name__ == "__main__":
    main()