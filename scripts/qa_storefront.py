"""
QA — Storefront overhaul (theme system, Buy-button fix, placeholder scrub).

Simulates the deployment pipeline offline and asserts the regressions that
shipped to production are gone:

  1. ai_generator._get_fallback_template renders index.html WITHOUT any raw
     {{tokens}} (logo_html, hero_emoji, product_count, hero_* were leaking).
  2. The generated page references the client runtime assets that the
     deployer ships.
  3. deployer._load_store_assets() actually returns storefront.js + modern.css
     (they were silently missing, which is what killed the Buy button).
  4. vercel.json no longer shadows *.js / *.css behind index.html.
  5. storefront.js contains the 5-theme system + UUID-safe lookup + delegated
     data-action handling, and no legacy array-index (`PRODUCTS[+id]`) code.

Usage: python scripts/qa_storefront.py   (0 = pass, 1 = fail)
"""

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
    status = "PASS" if cond else "FAIL"
    if not cond:
        FAILURES.append(name)
    print(f"  [{status}] {name}" + (f"  — {detail}" if detail and not cond else ""))


def main():
    store = {
        "id": "cf05c2c6-5bcd-4e01-98c9-210808533914",
        "name": "Cake me away",
        "description": "Artisant pâtissier — gâteaux sur mesure.",
        "primary_color": "#d472a0",
        "whatsapp_phone": "+213 555 12 34 56",
        "slug": "cake-me-away",
        "animation_style": "soft",
        "theme": "pastel",
        "api_url": "https://api.stores.example.com",
    }
    products = [
        {
            "id": "a1b2c3d4-e5f6-4a5b-9c8d-111111111111",
            "name": "Gâteau au chocolat",
            "price": 3500,
            "original_price": 4200,
            "category": "Gâteaux",
            "description": "Moelleux chocolat noir 70%.",
            "is_featured": True,
            "stock_quantity": 12,
            "images": [{"url": "https://img.example.com/cake1.jpg"}],
        },
        {
            "id": "b2c3d4e5-f6a7-4b5c-9d8e-222222222222",
            "name": "Cupcakes vanille",
            "price": 900,
            "category": "Desserts",
            "description": "Lot de 6 cupcakes vanille.",
            "is_featured": False,
            "stock_quantity": 30,
            "images": [],
        },
    ]

    print("== 1. Template rendering ==")
    html = ai_generator.AIStoreGenerator()._get_fallback_template(
        store, products,
        style={"font": "Inter"},
        seo={"description": "Gâteaux sur mesure à Alger."},
        slogan="Douceurs artisanales",
    )

    left = re.findall(r"\{\{\s*[a-zA-Z0-9_]+\s*\}\}", html)
    check("no raw {{tokens}} remain", not left, f"{left[:3]}")

    check("store_name injected", "Cake me away" in html)
    check("logo_html filled", 'class="logo-badge"' in html)
    check("hero emoji filled", "🛍️" in html)
    check("product_count injected", 'id="productCount">2 articles' in html)
    check("footer year injected", str(__import__("datetime").datetime.now().year) in html)
    check("store_data_json injected", 'window.STORE_DATA   = {' in html)
    check("products_json injected", "window.PRODUCTS_DATA = [" in html)
    check("runtime css referenced", './storefront-modern.css' in html)
    check("runtime js referenced", './storefront.js' in html)
    check("checkout button id present", 'id="btnCheckout"' in html)
    check("theme switcher is JS-driven", "THEMES" in open(
        os.path.join(ROOT, "store-template", "storefront.js"), encoding="utf-8").read())

    print("== 2. Deploy payload ==")
    assets = deployer._load_store_assets()
    names = [n for n, _ in assets]
    check("deployer ships storefront.js", "storefront.js" in names, f"got {names}")
    check("deployer ships modern.css", "storefront-modern.css" in names, f"got {names}")
    check("deployer ships runtime with content", all(c for _, c in assets), f"{[n for n, c in assets if not c]}")
    check("vercel.json no longer shadows assets", r"?!.*\\." in deployer.VERCEL_JSON or "(?!.*\\." in deployer.VERCEL_JSON)
    check("vercel.json still serves deep links", 'dest": "/index.html"' in deployer.VERCEL_JSON)

    print("== 3. Runtime static invariants ==")
    js = open(os.path.join(ROOT, "store-template", "storefront.js"), encoding="utf-8").read()
    check("string-safe add uses byId", "byId(id)" in js and "Cart.add" in js)
    code_no_comments = re.sub(r"//.*|/\*.*?\*/", "", js, flags=re.S)
    check("no array-index legacy lookup", "PRODUCTS[+" not in code_no_comments)
    check("5 themes defined", js.count("id: '") >= 5 and all(t in js for t in ("boutique", "minimal", "pastel", "luxe", "dark")))
    check("theme persistence key", "localStorage.getItem(THEME_KEY)" in js)
    check("input contrast guarantee (CSS)", "::placeholder" in open(
        os.path.join(ROOT, "store-template", "storefront-modern.css"), encoding="utf-8").read())

    print()
    if FAILURES:
        print("FAILED CHECKS:", ", ".join(FAILURES))
        sys.exit(1)
    print("ALL CHECKS PASSED ✅")
    sys.exit(0)


if __name__ == "__main__":
    main()