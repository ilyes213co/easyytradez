import gzip
import io
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from typing import Optional
from dependencies import get_supabase
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger("storegen.seo")

# ─── Dynamic Sitemap Generation ───────────────────────────────────────────────

@router.get("/{store_id}/sitemap.xml")
async def get_sitemap(store_id: str, request: Request, supabase=Depends(get_supabase)):
    """
    Génère dynamiquement le sitemap.xml pour une boutique spécifique.
    Inclut la page d'accueil, les catégories et tous les produits actifs.
    """
    # 1. Récupérer les infos de la boutique
    store_res = (
        supabase.table("stores")
        .select("slug, published_url, updated_at, seo_metadata")
        .eq("id", store_id)
        .single()
        .execute()
    )
    if not store_res.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    
    store = store_res.data
    seo_meta = store.get("seo_metadata") or {}
    base_url = store.get("published_url") or f"https://{store['slug']}.easytrade.dz"
    last_mod = store.get("updated_at", datetime.now().isoformat())[:10]

    # 2. Récupérer les produits actifs et leurs catégories
    products_res = (
        supabase.table("products")
        .select("slug, category, updated_at")
        .eq("store_id", store_id)
        .eq("status", "active")
        .execute()
    )
    products = products_res.data or []
    categories = sorted(list(set(p["category"] for p in products if p.get("category"))))

    # 3. Construire le XML
    xml_content = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{base_url}/</loc>',
        f'    <lastmod>{last_mod}</lastmod>',
        '    <changefreq>daily</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>'
    ]

    # Ajouter les catégories
    for cat in categories:
        xml_content.append('  <url>')
        xml_content.append(f'    <loc>{base_url}/?category={cat}</loc>')
        xml_content.append(f'    <lastmod>{last_mod}</lastmod>')
        xml_content.append('    <changefreq>weekly</changefreq>')
        xml_content.append('    <priority>0.7</priority>')
        xml_content.append('  </url>')

    # Ajouter les produits
    for p in products:
        p_slug = p.get("slug")
        if not p_slug: continue
        p_mod = p.get("updated_at", last_mod)[:10]
        xml_content.append('  <url>')
        xml_content.append(f'    <loc>{base_url}/product/{p_slug}</loc>')
        xml_content.append(f'    <lastmod>{p_mod}</lastmod>')
        xml_content.append('    <changefreq>weekly</changefreq>')
        xml_content.append('    <priority>0.8</priority>')
        xml_content.append('  </url>')

    xml_content.append('</urlset>')
    
    full_xml = "\n".join(xml_content).encode("utf-8")
    
    # Compression gzip si acceptée
    encoding = request.headers.get("Accept-Encoding", "")
    if "gzip" in encoding:
        out = io.BytesIO()
        with gzip.GzipFile(fileobj=out, mode="wb") as f:
            f.write(full_xml)
        return Response(
            content=out.getvalue(),
            media_type="application/xml",
            headers={"Content-Encoding": "gzip"},
        )

    return Response(content=full_xml, media_type="application/xml")


# ─── Dynamic Robots.txt Generation ───────────────────────────────────────────

@router.get("/{store_id}/robots.txt")
async def get_robots(store_id: str, supabase=Depends(get_supabase)):
    """
    Génère dynamiquement le robots.txt pour une boutique spécifique.
    """
    store_res = (
        supabase.table("stores")
        .select("slug, published_url, seo_metadata")
        .eq("id", store_id)
        .single()
        .execute()
    )
    if not store_res.data:
        raise HTTPException(status_code=404, detail="Boutique introuvable")

    store = store_res.data
    base_url = store.get("published_url") or f"https://{store['slug']}.easytrade.dz"
    
    # Custom robots settings from metadata if exists
    seo_meta = store.get("seo_metadata") or {}
    disallow_paths = seo_meta.get("disallow_paths", ["/admin", "/cart", "/checkout"])
    
    lines = [
        "User-agent: *",
    ]
    
    for path in disallow_paths:
        lines.append(f"Disallow: {path}")
        
    lines.append(f"\nSitemap: {base_url}/sitemap.xml")
    
    return Response(content="\n".join(lines), media_type="text/plain")
