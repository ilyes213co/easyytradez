"""
AIStoreGenerator — Moteur de génération IA de boutiques e-commerce.

Utilise Google Gemini 2.5 Pro pour générer :
• Un fichier HTML complet autonome (CSS + JS inline)
• Des métadonnées SEO optimisées
• Des descriptions de produits améliorées
• Un slogan accrocheur
"""

import os
import re
import json
import asyncio
import logging
import time
import html as html_module
import urllib.parse
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

try:
    from google import genai
    from google.genai import types as genai_types
except (ImportError, AttributeError):
    genai = None
    genai_types = None
from tenacity import (
    AsyncRetrying,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = logging.getLogger("storegen.ai")

THEME_DESIGN_TOKENS: Dict[str, Dict[str, str]] = {
    "crimson": {
        "bg": "#faf7f6",
        "card_bg": "#ffffff",
        "text": "#181111",
        "accent_style": "bold crimson accents (#9c1220), sharp edges, uppercase headings",
        "vibe": "leather atelier, bold Anton display + Barlow body font, premium crafted character",
    },
    "energetic": {
        "bg": "#f2f3f6",
        "card_bg": "#ffffff",
        "text": "#0f1116",
        "accent_style": "electric blue (#2f4dff) + neon lime (#c4ff2e) highlights, pill badges",
        "vibe": "high-energy sports & tech, Archivo bold italic headings, fitness audio performance",
    },
    "natural": {
        "bg": "#f7f5ee",
        "card_bg": "#fffdf7",
        "text": "#232a1e",
        "accent_style": "olive green (#4e6b39) and earthy soft hues, organic radius",
        "vibe": "Kabylie terroir, artisanal olive oil and honey, Newsreader serif + Work Sans body",
    },
    "monochrome": {
        "bg": "#ffffff",
        "card_bg": "#ffffff",
        "text": "#0d0d0d",
        "accent_style": "pure black & white minimalism, 0px radius, clean hairline dividers",
        "vibe": "Swiss watchmaking precision, Schibsted Grotesk typography, quiet luxury",
    },
    "luxe-noir": {
        "bg": "#0b0b0c",
        "card_bg": "#0f0f11",
        "text": "#eae5dc",
        "accent_style": "warm satin gold (#c6a76a), dark radial backdrop, gold borders",
        "vibe": "haute perfumery, night in Oran, Cormorant Garamond serif + Jost sans-serif",
    },
    "tuareg-indigo": {
        "bg": "#f6f1e5",
        "card_bg": "#fffcf4",
        "text": "#1e2350",
        "accent_style": "deep indigo (#2c3b7d) + desert gold (#c8a24a), Saharan heritage",
        "vibe": "Tamanrasset handmade silver jewelry, Amiri display + Cairo Arabic-friendly font",
    },
    "playful-pumpkin": {
        "bg": "#fff8ef",
        "card_bg": "#ffffff",
        "text": "#34241a",
        "accent_style": "pumpkin orange (#ef7b1c) with bold dark outlines and chunky pill buttons",
        "vibe": "cheerful kids school backpacks, Fredoka playful display + Nunito rounded body",
    },
    "neo-brutalist": {
        "bg": "#fffdf0",
        "card_bg": "#ffffff",
        "text": "#000000",
        "accent_style": "hard 3px solid black borders, 10px solid black box-shadows, electric yellow (#ffd400)",
        "vibe": "streetwear limited sneakers drop, Space Mono + DM Sans typography, unapologetic brutalism",
    },
    "phantom": {
        "bg": "#08090d",
        "card_bg": "#0e1016",
        "text": "#e9edf5",
        "accent_style": "neon cyan (#2fd9e8) cyber glow on stealth dark, glassmorphism badges",
        "vibe": "e-sport competitive gaming headset, Space Grotesk + Inter Tight, ultra-low latency",
    },
    "blossom-lavender": {
        "bg": "#fbf6fb",
        "card_bg": "#ffffff",
        "text": "#3a2a41",
        "accent_style": "delicate lavender purple (#8b62c4), soft pill shapes, gentle glow",
        "vibe": "Atlas rose skincare, soothing botanical beauty, Fraunces serif + Karla clean body",
    },
    "modern": {
        "bg": "#f8fafc",
        "card_bg": "#ffffff",
        "text": "#1e293b",
        "accent_style": "rounded-xl shadow-lg",
        "vibe": "clean lines, generous whitespace, subtle shadows, Inter/Outfit font",
    },
    "luxury": {
        "bg": "#0a0a0a",
        "card_bg": "#1a1a1a",
        "text": "#f5f0e8",
        "accent_style": "gold accents, serif headings, border-gold",
        "vibe": "dark elegance, gold (#d4af37) accents, Playfair Display headings, dramatic spacing",
    },
    "minimal": {
        "bg": "#ffffff",
        "card_bg": "#fafafa",
        "text": "#111111",
        "accent_style": "no shadows, thin borders, mono font for prices",
        "vibe": "ultra-clean, monochrome, lots of white, DM Sans font",
    },
    "colorful": {
        "bg": "#fef9f4",
        "card_bg": "#ffffff",
        "text": "#2d2d2d",
        "accent_style": "vibrant gradients, rounded-2xl, playful",
        "vibe": "bold gradients, playful rounded shapes, Poppins font, colorful badges",
    },
    "tech": {
        "bg": "#0f172a",
        "card_bg": "#1e293b",
        "text": "#e2e8f0",
        "accent_style": "glassmorphism, neon accents, monospace details",
        "vibe": "dark sci-fi, glassmorphism panels, neon glow on primary color, JetBrains Mono for prices",
    },
    "nature": {
        "bg": "#f0fdf4",
        "card_bg": "#ffffff",
        "text": "#14532d",
        "accent_style": "organic shapes, earthy tones, leaf motifs",
        "vibe": "earthy greens + browns, organic rounded shapes, Nunito font, nature SVG decorations",
    },
}

ANIMATION_STYLES: Dict[str, str] = {
    "none": "Aucune animation. Transitions CSS basiques (0.2s ease) sur hover uniquement.",
    "soft": "Animations subtiles : fade-in au scroll (IntersectionObserver), hover scale(1.03) sur les cards, transition douce sur le panier.",
    "dynamic": "Animations marquées : slide-in cards au scroll, counter animé pour les prix, hover avec lift + shadow, cart badge bounce, hero text typewriter effect.",
    "spectacular": "Animations spectaculaires : particles.js en hero background, parallax scroll sections, GSAP stagger sur les produits, counter animé pour stats, morphing shapes decoratives, micro-interactions partout.",
}

EFFECTS_INSTRUCTIONS: Dict[str, str] = {
    "parallax": "Ajoute un effet parallax sur le hero (background-attachment: fixed ou transform translate3d au scroll).",
    "particles": "Ajoute un canvas de particules animées en arrière-plan du hero (implémente un système simple de particules en JS vanilla, pas de librairie externe).",
    "counter": "Ajoute des counters animés dans une section stats (nombre de produits, clients satisfaits, etc.) qui comptent de 0 à la valeur quand visibles.",
}


ALGERIA_WILAYAS_DATA = [
    (1, "Adrar", 950, 600), (2, "Chlef", 550, 300), (3, "Laghouat", 700, 400),
    (4, "Oum El Bouaghi", 700, 400), (5, "Batna", 700, 400), (6, "Béjaïa", 700, 400),
    (7, "Biskra", 750, 450), (8, "Béchar", 950, 600), (9, "Blida", 500, 300),
    (10, "Bouira", 550, 300), (11, "Tamanrasset", 1400, 900), (12, "Tébessa", 750, 450),
    (13, "Tlemcen", 550, 300), (14, "Tiaret", 600, 350), (15, "Tizi Ouzou", 600, 350),
    (16, "Alger", 500, 300), (17, "Djelfa", 700, 400), (18, "Jijel", 700, 400),
    (19, "Sétif", 700, 400), (20, "Saïda", 550, 300), (21, "Skikda", 700, 400),
    (22, "Sidi Bel Abbès", 500, 300), (23, "Annaba", 750, 450), (24, "Guelma", 750, 450),
    (25, "Constantine", 700, 400), (26, "Médéa", 600, 350), (27, "Mostaganem", 450, 280),
    (28, "M'Sila", 700, 400), (29, "Mascara", 500, 300), (30, "Ouargla", 900, 550),
    (31, "Oran", 400, 250), (32, "El Bayadh", 800, 500), (33, "Illizi", 1400, 900),
    (34, "Bordj Bou Arreridj", 650, 350), (35, "Boumerdès", 550, 300), (36, "El Tarf", 750, 450),
    (37, "Tindouf", 1400, 900), (38, "Tissemsilt", 650, 350), (39, "El Oued", 850, 500),
    (40, "Khenchela", 750, 450), (41, "Souk Ahras", 750, 450), (42, "Tipaza", 550, 300),
    (43, "Mila", 700, 400), (44, "Aïn Defla", 600, 350), (45, "Naâma", 800, 500),
    (46, "Aïn Témouchent", 450, 280), (47, "Ghardaïa", 850, 500), (48, "Relizane", 500, 300),
    (49, "Timimoun", 1000, 650), (50, "Bordj Badji Mokhtar", 1500, 1000), (51, "Ouled Djellal", 800, 450),
    (52, "Béni Abbès", 1000, 650), (53, "In Salah", 1300, 850), (54, "In Guezzam", 1500, 1000),
    (55, "Touggourt", 900, 550), (56, "Djanet", 1400, 900), (57, "El M'Ghair", 850, 500),
    (58, "El Meniaa", 950, 600),
]


class AIStoreGenerator:
    """
    Générateur de boutiques e-commerce via Google Gemini 2.5 Pro.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        supabase_client: Optional[Any] = None,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY manquant — les fonctionnalités IA échoueront.")
        self.client = genai.Client(api_key=self.api_key) if (self.api_key and genai is not None) else None
        self.model = "gemini-2.5-flash"
        self.supabase = supabase_client

    async def _call_gemini(
        self,
        prompt: str,
        system_prompt: str,
        max_tokens: int = 4096,
        *,
        method_name: str = "unknown",
        store_id: Optional[str] = None,
    ) -> Tuple[str, dict]:
        """
        Appelle l'API Gemini avec retry automatique.
        Retourne (texte, metadata_usage).
        """
        if not self.client:
            raise RuntimeError("Client Gemini non initialisé (API key manquante)")

        start = time.time()
        combined_prompt = f"{system_prompt}\n\n---\n\n{prompt}"

        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(3),
                wait=wait_exponential(multiplier=1, min=2, max=10),
                retry=retry_if_exception_type(Exception),
                reraise=True,
            ):
                with attempt:
                    response = await self.client.aio.models.generate_content(
                        model=self.model,
                        contents=combined_prompt,
                        config=genai_types.GenerateContentConfig(
                            max_output_tokens=max_tokens,
                            temperature=0.7,
                        ),
                    )
                    duration = time.time() - start

                    text = response.text or ""
                    usage_meta = getattr(response, "usage_metadata", None)
                    input_tokens = getattr(usage_meta, "prompt_token_count", 0) or 0
                    output_tokens = getattr(usage_meta, "candidates_token_count", 0) or 0

                    usage = {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "duration_seconds": round(duration, 2),
                    }

                    logger.info(
                        f"✅ Gemini [{method_name}] — {duration:.2f}s, "
                        f"in={input_tokens} out={output_tokens} tokens"
                    )

                    asyncio.create_task(
                        self._log_to_supabase(
                            method=method_name,
                            store_id=store_id,
                            success=True,
                            tokens_in=input_tokens,
                            tokens_out=output_tokens,
                            duration=duration,
                        )
                    )
                    return text, usage

        except Exception as e:
            duration = time.time() - start
            logger.warning(f"⚠️ Gemini [{method_name}] échec définitif après {duration:.2f}s: {e}")
            asyncio.create_task(
                self._log_to_supabase(
                    method=method_name,
                    store_id=store_id,
                    success=False,
                    duration=duration,
                    error=str(e),
                )
            )
            raise

    async def _log_to_supabase(
        self,
        *,
        method: str,
        store_id: Optional[str] = None,
        success: bool = True,
        tokens_in: int = 0,
        tokens_out: int = 0,
        duration: float = 0.0,
        error: Optional[str] = None,
    ) -> None:
        if not self.supabase:
            return
        try:
            self.supabase.table("ai_generation_logs").insert(
                {
                    "method": method,
                    "store_id": store_id,
                    "success": success,
                    "tokens_in": tokens_in,
                    "tokens_out": tokens_out,
                    "total_tokens": tokens_in + tokens_out,
                    "duration_seconds": round(duration, 2),
                    "error": error,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            ).execute()
        except Exception as e:
            logger.warning(f"Supabase logging échoué (non bloquant): {e}")

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        stripped = text.strip()
        if stripped.startswith("```"):
            first_newline = stripped.index("\n") if "\n" in stripped else len(stripped)
            stripped = stripped[first_newline + 1:]
        if stripped.endswith("```"):
            stripped = stripped[:-3]
        return stripped.strip()

    @staticmethod
    def _format_money_da(amount: Any) -> str:
        try:
            val = int(float(amount))
            return f"{val:,}".replace(",", " ") + " DA"
        except Exception:
            return f"{amount} DA"



    def _render_ready_template(self, store_data: Dict[str, Any]) -> Optional[str]:
        store = store_data.get("store", {})
        store_id = str(store.get("id") or "")
        products = store_data.get("products", [])
        slogan_text = store_data.get("slogan", "")
        store_type = store.get("type") or (store.get("seo_metadata") or {}).get("type") or "boutique"
        is_funnel = store_type == "funnel"

        raw_theme = store.get("theme", "crimson")
        theme_aliases = {
            "modern": "crimson",
            "minimaliste": "monochrome",
            "tech": "phantom",
            "nature": "natural",
            "luxe": "luxe-noir",
            "colore": "playful-pumpkin",
            "pantry-basics": "crimson",
            "habitat-occasions": "luxe-noir",
            "botanica-organic": "natural",
            "circuit-performance": "phantom",
            "atelier-editorial": "monochrome",
        }
        theme = theme_aliases.get(raw_theme, raw_theme)

        templates_base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "store-template", "templates"))
        subfolder = "funnels" if is_funnel else "boutiques"
        tpl_path = os.path.join(templates_base, subfolder, f"{theme}.html")

        if not os.path.isfile(tpl_path):
            ref_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "reference-designs", "templates", subfolder, f"{theme}.html"))
            if os.path.isfile(ref_path):
                tpl_path = ref_path
            else:
                return None

        try:
            with open(tpl_path, "r", encoding="utf-8") as f:
                content = f.read()

            store_name = html_module.escape(store.get("name") or "Ma Boutique")
            desc = html_module.escape(store.get("description") or "Bienvenue dans notre boutique.")
            slogan = html_module.escape(slogan_text or store.get("slogan") or desc)
            phone = store.get("whatsapp_phone") or ""
            clean_phone = re.sub(r"\D", "", phone)

            if is_funnel:
                if not products:
                    logger.warning("Funnel deploy without products for store %s — returning None for fallback", store.get("id"))
                    return None

                star_product = products[0]
                p_name = html_module.escape(star_product.get("name") or "Produit")
                p_desc = html_module.escape(star_product.get("description") or desc)
                p_price = int(float(star_product.get("price") or 0))
                p_compare = star_product.get("compare_price") or star_product.get("original_price")
                p_images = star_product.get("images") or []
                if p_images and isinstance(p_images[0], dict):
                    p_images = [img.get("url", "") for img in p_images if img.get("url")]
                elif p_images and isinstance(p_images[0], str):
                    p_images = [img for img in p_images if img]
                p_img = p_images[0] if p_images else ""
                formatted_price = self._format_money_da(p_price)

                # Breadcrumbs
                content = re.sub(
                    r'<nav class="pd-crumbs".*?>.*?</nav>',
                    f'<nav class="pd-crumbs" aria-label="Fil d\'ariane"><a href="#">Accueil</a> / <span>{p_name}</span></nav>',
                    content,
                    count=1,
                    flags=re.DOTALL
                )

                content = re.sub(r"<title>.*?</title>", f"<title>{p_name} — {store_name}</title>", content, count=1)
                content = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{p_desc[:160]}">', content, count=1)

                if store.get("logo_url"):
                    brand_html = f'<a class="pd-brand" href="#"><img src="{store["logo_url"]}" alt="{store_name}" style="height:32px;object-fit:contain;" /></a>'
                    content = re.sub(r'<a class="pd-brand" href="#">.*?</a>', brand_html, content, count=1)
                else:
                    content = re.sub(r'<a class="pd-brand" href="#">.*?</a>', f'<a class="pd-brand" href="#">{store_name}</a>', content, count=1)

                content = re.sub(r'<p class="pd-top__note">.*?</p>', f'<p class="pd-top__note">{slogan}</p>', content, count=1)
                content = re.sub(r'<h1 class="pd-title">.*?</h1>', f'<h1 class="pd-title">{p_name}</h1>', content, count=1)
                content = re.sub(r'<p class="pd-vendor">.*?</p>', f'<p class="pd-vendor">{store_name}</p>', content, count=1)

                # Prices
                content = re.sub(
                    r'<strong class="pd-price".*?>.*?</strong>',
                    f'<strong class="pd-price" data-price="{p_price}">{formatted_price}</strong>',
                    content,
                    count=1
                )
                if p_compare and float(p_compare) > p_price:
                    cmp_val = int(float(p_compare))
                    pct = int(round((1 - p_price / cmp_val) * 100))
                    content = re.sub(r'<s class="pd-was">.*?</s>', f'<s class="pd-was">{self._format_money_da(cmp_val)}</s>', content, count=1)
                    content = re.sub(r'<span class="pd-off">.*?</span>', f'<span class="pd-off">-{pct}%</span>', content, count=1)
                else:
                    content = re.sub(r'<s class="pd-was">.*?</s>', '', content, count=1)
                    content = re.sub(r'<span class="pd-off">.*?</span>', '', content, count=1)

                # Subtotal, Total, Stickybar Price
                content = re.sub(r'<span data-subtotal>.*?</span>', f'<span data-subtotal>{formatted_price}</span>', content, count=1)
                content = re.sub(r'<span data-total>.*?</span>', f'<span data-total>{formatted_price}</span>', content, count=1)
                content = re.sub(
                    r'<p class="pd-stickybar__price">.*?</p>',
                    f'<p class="pd-stickybar__price">{formatted_price}<small>paiement à la livraison</small></p>',
                    content,
                    count=1,
                    flags=re.DOTALL
                )

                # Gallery & Images
                if p_img:
                    img_markup = f'<img src="{p_img}" alt="{p_name}" style="width:100%;height:100%;object-fit:cover;" />'
                    content = re.sub(
                        r'(<figure class="pd-stage"[^>]*>)(.*?)(</figure>)',
                        rf'\1<span class="pd-stage__flag">Best-seller</span>{img_markup}\3',
                        content,
                        count=1,
                        flags=re.DOTALL
                    )
                else:
                    placeholder_markup = '<div style="display:grid;place-items:center;height:100%;font-size:56px;background:rgba(0,0,0,0.04);">🛍️</div>'
                    content = re.sub(
                        r'(<figure class="pd-stage"[^>]*>)(.*?)(</figure>)',
                        rf'\1<span class="pd-stage__flag">Nouveau</span>{placeholder_markup}\3',
                        content,
                        count=1,
                        flags=re.DOTALL
                    )

                # Normalize body class: never hide pd-thumbs with g-stack
                content = re.sub(r'<body class="g-stack"', '<body class="g-side"', content)
                content = re.sub(r'\.g-stack\s*\.pd-thumbs\{[^}]*\}', '', content)

                if len(p_images) <= 1:
                    content = re.sub(r'<ul class="pd-thumbs">.*?</ul>', '<ul class="pd-thumbs" style="display:none;"></ul>', content, count=1, flags=re.DOTALL)
                    content = re.sub(r'<div class="pd-extra">.*?</div>', '<div class="pd-extra" style="display:none;"></div>', content, count=1, flags=re.DOTALL)
                else:
                    thumbs_items = "".join(
                        f'<li><button type="button" class="pd-thumb" data-thumb="{i+1}" aria-current="{"true" if i == 0 else "false"}" aria-label="Vue {i+1}"><img src="{img_u}" alt="" style="width:100%;height:100%;object-fit:cover;" /></button></li>'
                        for i, img_u in enumerate(p_images)
                    )
                    content = re.sub(r'<ul class="pd-thumbs">.*?</ul>', f'<ul class="pd-thumbs">{thumbs_items}</ul>', content, count=1, flags=re.DOTALL)
                    content = re.sub(r'<div class="pd-extra">.*?</div>', '<div class="pd-extra" style="display:none;"></div>', content, count=1, flags=re.DOTALL)

                    gallery_script = """
<script>
document.addEventListener("DOMContentLoaded", function() {
  var thumbs = document.querySelectorAll(".pd-thumb");
  thumbs.forEach(function(t) {
    t.addEventListener("click", function(e) {
      e.preventDefault();
      thumbs.forEach(function(o) { o.setAttribute("aria-current", "false"); });
      t.setAttribute("aria-current", "true");
      var stage = document.querySelector(".pd-stage") || document.querySelector("[data-stage]");
      var thumbImg = t.querySelector("img");
      if (stage && thumbImg) {
        var mainImg = stage.querySelector("img");
        if (mainImg) {
          mainImg.src = thumbImg.src;
        }
      }
    });
  });
});
</script>
"""
                    if "</body>" in content:
                        content = content.replace("</body>", f"{gallery_script}</body>")
                    else:
                        content += gallery_script

                # Variants & Options
                p_opts = star_product.get("options") or []
                if not p_opts:
                    content = re.sub(r'<div class="pd-field">\s*<p class="pd-label">(?:Couleur|Taille|Format).*?</p>\s*<div class="pd-opts" data-variant-group="[^"]*">.*?</div>\s*</div>', '', content, flags=re.DOTALL)
                    clean_spec = '<p style="padding:16px 0;opacity:0.8;font-size:14px;">Produit sélectionné avec soin. Conforme à la description et aux normes de qualité.</p>'
                    content = re.sub(r'(<div class="pd-panel" data-panel="spec"[^>]*>)(.*?)(</div>)', rf'\1{clean_spec}\3', content, count=1, flags=re.DOTALL)
                else:
                    options_html_list = []
                    for opt in p_opts:
                        opt_name = html_module.escape(opt.get("name") or "Option")
                        opt_type = opt.get("type", "chip")
                        group_id = re.sub(r"\W+", "_", opt_name.lower())
                        vals = opt.get("values") or []
                        if not vals:
                            continue
                        first_avail = next((v for v in vals if v.get("available", True)), vals[0])
                        active_val = html_module.escape(first_avail.get("label") or "")
                        btns = []
                        for v in vals:
                            lbl = html_module.escape(v.get("label") or "")
                            avail = v.get("available", True)
                            pressed = "true" if lbl == active_val else "false"
                            dis = "" if avail else "disabled"
                            if opt_type == "swatch":
                                hex_c = html_module.escape(v.get("hex") or "#3b82f6")
                                btns.append(f'<button type="button" class="pd-swatch" data-variant="{lbl}" aria-pressed="{pressed}" aria-label="{lbl}" style="background:{hex_c}" title="{lbl}" {dis}></button>')
                            else:
                                btns.append(f'<button type="button" class="pd-chip" data-variant="{lbl}" aria-pressed="{pressed}" {dis}>{lbl}</button>')
                        options_html_list.append(f'''<div class="pd-field">
  <p class="pd-label">{opt_name} <span data-variant-out="{group_id}">{active_val}</span></p>
  <div class="pd-opts" data-variant-group="{group_id}">
    {"".join(btns)}
  </div>
</div>''')
                    dynamic_opts = "\n".join(options_html_list)
                    pattern = r'(<div class="pd-field">\s*<p class="pd-label">(?:Couleur|Taille|Format).*?</div>\s*</div>(?:\s*<div class="pd-field">\s*<p class="pd-label">(?:Couleur|Taille|Format).*?</div>\s*</div>)?)'
                    if re.search(pattern, content, flags=re.DOTALL):
                        content = re.sub(pattern, dynamic_opts, content, count=1, flags=re.DOTALL)
                    else:
                        content = re.sub(r'(<div class="pd-field">\s*<p class="pd-label">Quantité</p>)', f'{dynamic_opts}\n\\1', content, count=1)

                # Description & Benefits Panel
                desc_html = f'<p>{p_desc}</p>'
                benefits = star_product.get("benefits") or []
                if benefits and any(isinstance(b, str) and b.strip() for b in benefits):
                    b_items = "".join(f'<li>{html_module.escape(b)}</li>' for b in benefits if isinstance(b, str) and b.strip())
                    if b_items:
                        desc_html += f'<h3>Points forts</h3><ul class="pd-list">{b_items}</ul>'

                content = re.sub(
                    r'(<div class="pd-panel" data-panel="desc"[^>]*>)(.*?)(</div>\s*<div class="pd-panel"|\s*</section>)',
                    rf'\1{desc_html}</div>\3',
                    content,
                    count=1,
                    flags=re.DOTALL
                )

                if clean_phone:
                    content = re.sub(r'href="tel:[^"]*"', f'href="tel:{clean_phone}"', content)
                else:
                    content = re.sub(r'<a class="pd-btn pd-btn--call".*?</a>', '', content, count=1, flags=re.DOTALL)

                foot_text = f'{store_name} — Algérie 🇩🇿 · Commandes 7j/7 · Paiement à la livraison'
                content = re.sub(r'<footer class="pd-foot">.*?</footer>', f'<footer class="pd-foot"><div class="pd-shell">{foot_text}</div></footer>', content, count=1, flags=re.DOTALL)

                # Injecter les champs clients (Nom, Téléphone, Adresse) dans la boîte de commande COD
                star_id = str(star_product.get("id") or "")
                cust_fields_html = '''
        <div class="pd-field" style="margin-top:14px;margin-bottom:10px;">
          <label class="pd-label" for="pd-cust-name" style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Nom et Prénom *</label>
          <input type="text" id="pd-cust-name" required placeholder="Votre nom complet" style="width:100%;height:44px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:var(--radius-sm, 6px);background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
        </div>
        <div class="pd-field" style="margin-bottom:10px;">
          <label class="pd-label" for="pd-cust-phone" style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Numéro de téléphone *</label>
          <input type="tel" id="pd-cust-phone" required placeholder="0555 12 34 56" style="width:100%;height:44px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:var(--radius-sm, 6px);background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
        </div>
        <div class="pd-field" style="margin-bottom:16px;">
          <label class="pd-label" for="pd-cust-address" style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Adresse exacte de livraison (commune, quartier...)</label>
          <input type="text" id="pd-cust-address" placeholder="Ex: Cité 500 logts, Bab Ezzouar" style="width:100%;height:44px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:var(--radius-sm, 6px);background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
        </div>
'''
                if '<ul class="pd-sum">' in content:
                    content = content.replace('<ul class="pd-sum">', f'{cust_fields_html}<ul class="pd-sum">')
                elif '<div class="pd-actions">' in content:
                    content = content.replace('<div class="pd-actions">', f'{cust_fields_html}<div class="pd-actions">')

                # Script de soumission réelle de commande pour le funnel
                funnel_script = f'''
<script>
(function() {{
  var storeId = "{store_id}";
  var productId = "{star_id}";
  var productName = "{p_name}";
  var productPrice = {p_price};
  var supabaseUrl = "https://lyntwhvvnklmcprnnump.supabase.co";
  var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bnR3aHZ2bmtsbWNwcm5udW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzUwOTksImV4cCI6MjEwNTM1MTA5OX0.-X3fmDagUiluvTDU6wY7UBwNll0-Bsu7gJ54uhL77PQ";

  try {{
    fetch(supabaseUrl + "/rest/v1/shipping_rates?store_id=eq." + storeId + "&select=wilaya_id,price_home,price_desk,wilayas(name)", {{
      headers: {{ "apikey": supabaseAnonKey, "Authorization": "Bearer " + supabaseAnonKey }}
    }})
    .then(function(r) {{ return r.json(); }})
    .then(function(customRates) {{
      if (Array.isArray(customRates) && customRates.length > 0) {{
        var wSel = document.querySelector('[data-wilaya]');
        if (wSel) {{
          customRates.forEach(function(cr) {{
            var wName = cr.wilayas ? String(cr.wilayas.name).toLowerCase() : '';
            for (var i = 0; i < wSel.options.length; i++) {{
              var opt = wSel.options[i];
              if (opt.value && (opt.value.toLowerCase() === wName || opt.text.toLowerCase().indexOf(wName) !== -1)) {{
                opt.setAttribute('data-home', cr.price_home);
                opt.setAttribute('data-desk', cr.price_desk);
              }}
            }}
          }});
        }}
      }}
    }})
    .catch(function() {{}});
  }} catch (e) {{}}

  function handleFunnelOrder(btn) {{
    var toast = document.querySelector('[data-toast]');
    var timer;
    function notify(msg) {{
      if (!toast) {{ alert(msg); return; }}
      toast.textContent = msg;
      toast.dataset.open = 'true';
      clearTimeout(timer);
      timer = setTimeout(function() {{ toast.dataset.open = 'false'; }}, 4500);
    }}

    var wilaya = document.querySelector('[data-wilaya]');
    if (wilaya && !wilaya.value) {{
      wilaya.focus();
      notify('Veuillez choisir votre wilaya de livraison.');
      return;
    }}

    var nameInp = document.getElementById('pd-cust-name');
    var nameVal = nameInp ? nameInp.value.trim() : '';
    if (!nameVal || nameVal.length < 2) {{
      if (nameInp) nameInp.focus();
      notify('Veuillez renseigner votre nom complet.');
      return;
    }}

    var phoneInp = document.getElementById('pd-cust-phone');
    var phoneVal = phoneInp ? phoneInp.value.replace(/\\D/g, '') : '';
    if (!phoneVal || phoneVal.length < 9) {{
      if (phoneInp) phoneInp.focus();
      notify('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }}

    var addrInp = document.getElementById('pd-cust-address');
    var addrVal = addrInp ? addrInp.value.trim() : '';

    var qtyInp = document.querySelector('[data-qty]');
    var qty = qtyInp ? (parseInt(qtyInp.value, 10) || 1) : 1;

    var modeRadio = document.querySelector('input[data-ship-mode]:checked');
    var shipMode = modeRadio ? modeRadio.value : 'domicile';

    var opt = wilaya ? wilaya.options[wilaya.selectedIndex] : null;
    var shipCost = 0;
    if (opt) {{
      shipCost = parseInt(opt.getAttribute(shipMode === 'stopdesk' ? 'data-desk' : 'data-home'), 10) || 0;
    }}
    var totalAmount = (productPrice * qty) + shipCost;
    var wilayaName = wilaya ? wilaya.value : '';
    var fullAddress = 'Wilaya: ' + wilayaName + ' (' + (shipMode === 'stopdesk' ? 'Stop Desk' : 'À domicile') + ')' + (addrVal ? ' — ' + addrVal : '');

    var options = {{}};
    document.querySelectorAll('[data-variant-group]').forEach(function(grp) {{
      var active = grp.querySelector('[aria-pressed="true"]');
      if (active) {{
        options[grp.dataset.variantGroup] = active.dataset.variant || active.textContent.trim();
      }}
    }});

    var payload = {{
      store_id: storeId,
      customer_name: nameVal,
      customer_phone: phoneVal,
      customer_address: fullAddress,
      total_amount: totalAmount,
      status: 'pending',
      payment_status: 'pending',
      items: [{{
        product_id: productId,
        name: productName,
        price: productPrice,
        quantity: qty,
        options_selected: options
      }}],
      notes: null
    }};

    var origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.75';
    btn.innerHTML = 'Enregistrement en cours...';

    // 1. Direct Supabase insert via REST API
    fetch(supabaseUrl + '/rest/v1/orders', {{
      method: 'POST',
      headers: {{
        'apikey': supabaseAnonKey,
        'Authorization': 'Bearer ' + supabaseAnonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }},
      body: JSON.stringify(payload)
    }})
    .then(function(res) {{
      if (res.ok) {{
        notify('🎉 Commande enregistrée avec succès ! Notre équipe vous appellera pour confirmer.');
        if (nameInp) nameInp.value = '';
        if (phoneInp) phoneInp.value = '';
        if (addrInp) addrInp.value = '';
      }} else {{
        throw new Error('Supabase status: ' + res.status);
      }}
    }})
    .catch(function(err) {{
      console.warn('Fallback to platform orders API...', err);
      return fetch('/api/orders', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload)
      }})
      .then(function(fb) {{
        if (fb.ok) {{
          notify('🎉 Commande enregistrée avec succès ! Nous vous appellerons pour confirmer.');
          if (nameInp) nameInp.value = '';
          if (phoneInp) phoneInp.value = '';
          if (addrInp) addrInp.value = '';
        }} else {{
          notify('Erreur lors de la validation. Veuillez vérifier vos données ou appeler directement.');
        }}
      }});
    }})
    .finally(function() {{
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = origHtml;
    }});
  }}

  function attachFunnel() {{
    document.querySelectorAll('[data-action="order"]').forEach(function(b) {{
      b.onclick = function(e) {{
        e.preventDefault();
        e.stopImmediatePropagation();
        handleFunnelOrder(b);
        return false;
      }};
    }});
  }}

  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', attachFunnel);
  }} else {{
    attachFunnel();
  }}
}})();
</script>
'''
                if '</body>' in content:
                    content = content.replace('</body>', f'{funnel_script}</body>')
                else:
                    content += funnel_script

                return content
            else:
                # BOUTIQUE
                content = re.sub(r"<title>.*?</title>", f"<title>{store_name} — Boutique officielle</title>", content, count=1)
                content = re.sub(r'<meta name="description" content=".*?">', f'<meta name="description" content="{desc[:160]}">', content, count=1)

                if store.get("logo_url"):
                    brand_html = f'<a class="st-nav__brand" href="#"><img src="{store["logo_url"]}" alt="{store_name}" style="height:32px;object-fit:contain;" /></a>'
                    content = re.sub(r'<a class="st-nav__brand" href=".*?">.*?</a>', brand_html, content, count=1)
                else:
                    content = re.sub(r'<a class="st-nav__brand" href=".*?">.*?</a>', f'<a class="st-nav__brand" href="#">{store_name}</a>', content, count=1)

                content = re.sub(r'<h1 class="st-hero__title">.*?</h1>', f'<h1 class="st-hero__title">{slogan}</h1>', content, count=1)
                content = re.sub(r'<p class="st-hero__sub">.*?</p>', f'<p class="st-hero__sub">{desc}</p>', content, count=1)

                first_img = ""
                for p in products:
                    imgs = p.get("images") or []
                    if imgs:
                        first_img = imgs[0].get("url", imgs[0]) if isinstance(imgs[0], dict) else imgs[0]
                        if first_img:
                            break
                if first_img:
                    content = re.sub(
                        r'(<div class="st-hero__art"[^>]*>)(.*?)(</div>)',
                        rf'\1<img src="{first_img}" alt="{store_name}" style="width:100%;height:100%;object-fit:cover;" />\3',
                        content,
                        count=1,
                        flags=re.DOTALL
                    )

                cats = list(dict.fromkeys(p.get("category") for p in products if p.get("category")))
                if cats:
                    links_html = "".join(f'<li><a href="#catalogue">{html_module.escape(c)}</a></li>' for c in cats[:5])
                    content = re.sub(r'<ul class="st-nav__links">.*?</ul>', f'<ul class="st-nav__links">{links_html}</ul>', content, count=1, flags=re.DOTALL)
                else:
                    content = re.sub(r'<ul class="st-nav__links">.*?</ul>', '<ul class="st-nav__links"><li><a href="#catalogue">Catalogue</a></li></ul>', content, count=1, flags=re.DOTALL)

                cards_html = []
                for p in products:
                    p_name = html_module.escape(p.get("name") or "Produit")
                    p_price = int(float(p.get("price") or 0))
                    p_cat = html_module.escape(p.get("category") or "Article")
                    p_id = str(p.get("id") or "")
                    imgs = p.get("images") or []
                    img_url = imgs[0].get("url", imgs[0]) if (imgs and isinstance(imgs[0], dict)) else (imgs[0] if imgs else "")
                    art_html = f'<img src="{img_url}" alt="{p_name}" style="width:100%;height:100%;object-fit:cover;" />' if img_url else '<div style="font-size:38px;display:grid;place-items:center;height:100%;">🛍️</div>'

                    # Aperçu visuel des variantes sur la carte produit
                    p_opts = p.get("options") or []
                    opts_json_attr = html_module.escape(json.dumps(p_opts), quote=True)

                    opts_preview_items = []
                    for opt in p_opts:
                        opt_type = opt.get("type", "chip")
                        vals = opt.get("values") or []
                        if opt_type == "swatch" and vals:
                            swatches_dots = []
                            for v in vals[:5]:
                                hex_c = html_module.escape(v.get("hex") or "#3b82f6")
                                lbl = html_module.escape(v.get("label") or "")
                                swatches_dots.append(f'<span title="{lbl}" style="display:inline-block;width:13px;height:13px;border-radius:50%;background:{hex_c};border:1.5px solid rgba(0,0,0,0.15);box-shadow:0 1px 2px rgba(0,0,0,0.08);"></span>')
                            if len(vals) > 5:
                                swatches_dots.append(f'<span style="font-size:10px;color:var(--muted);line-height:1;">+{len(vals)-5}</span>')
                            opts_preview_items.append(f'<div style="display:flex;align-items:center;gap:4px;">{"".join(swatches_dots)}</div>')
                        elif opt_type == "chip" and vals:
                            chip_labels = [html_module.escape(v.get("label") or "") for v in vals[:3] if v.get("label")]
                            badge_text = ", ".join(chip_labels)
                            if len(vals) > 3:
                                badge_text += f" +{len(vals)-3}"
                            opt_title = html_module.escape(opt.get("name") or "Option")
                            opts_preview_items.append(f'<span style="font-size:11px;color:var(--muted);background:var(--stage, #f3f4f6);padding:2px 7px;border-radius:10px;line-height:1.3;">{opt_title}: {badge_text}</span>')

                    opts_preview_html = f'<div class="st-card__opts" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-height:22px;margin:2px 0 4px 0;">{"".join(opts_preview_items)}</div>' if opts_preview_items else '<div class="st-card__opts" style="min-height:6px;"></div>'

                    card = f'''<div class="st-card">
  <span class="st-card__art">
    <span class="st-card__cat">{p_cat}</span>
    {art_html}
  </span>
  <span class="st-card__name">{p_name}</span>
  <span class="st-card__price">{self._format_money_da(p_price)}</span>
  {opts_preview_html}
  <button type="button" class="pd-btn pd-btn--buy st-open-checkout" data-pid="{p_id}" data-pname="{p_name}" data-price="{p_price}" data-pimg="{img_url}" data-pcat="{p_cat}" data-popts="{opts_json_attr}" style="padding:9px 16px;font-size:13px;font-weight:700;text-align:center;cursor:pointer;border:none;width:100%;border-radius:var(--btn-radius, 8px);">Commander</button>
</div>'''
                    cards_html.append(card)

                if cards_html:
                    content = re.sub(
                        r'(<div class="st-cards">)(.*?)(</div>\s*</div>\s*</section>)',
                        rf'\1{"".join(cards_html)}\3',
                        content,
                        count=1,
                        flags=re.DOTALL
                    )
                else:
                    empty_notice = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;opacity:0.65;font-size:15px;color:currentColor;">Le catalogue est en cours d\'approvisionnement. Revenez très bientôt !</div>'
                    content = re.sub(
                        r'(<div class="st-cards">)(.*?)(</div>\s*</div>\s*</section>)',
                        rf'\1{empty_notice}\3',
                        content,
                        count=1,
                        flags=re.DOTALL
                    )

                foot_text = f'{store_name} — Algérie 🇩🇿 · Commandes 7j/7 · Paiement sécurisé à la livraison'
                content = re.sub(r'<footer class="pd-foot">.*?</footer>', f'<footer class="pd-foot"><div class="pd-shell">{foot_text}</div></footer>', content, count=1, flags=re.DOTALL)

                # Injecter la modale de commande COD pour boutique (pas de redirection WhatsApp)
                wilayas_json_str = json.dumps(ALGERIA_WILAYAS_DATA)
                boutique_modal_html = f'''
<!-- COD Quick Checkout Modal -->
<div id="st-checkout-modal" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.65);backdrop-filter:blur(5px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">
  <div style="background:var(--surface, #ffffff);color:var(--text, #111827);border:1px solid var(--border, #e5e7eb);border-radius:var(--radius, 16px);width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);position:relative;padding:24px;box-sizing:border-box;font-family:var(--font-body, system-ui, sans-serif);">
    
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border, #e5e7eb);padding-bottom:12px;margin-bottom:16px;">
      <h3 style="margin:0;font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px;">
        <span>🛍️</span> Commander en direct
      </h3>
      <button type="button" id="st-close-modal" style="background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:var(--muted, #6b7280);padding:4px;">✕</button>
    </div>

    <!-- Selected Product Summary -->
    <div style="display:flex;gap:14px;align-items:center;background:var(--ship-bg, rgba(0,0,0,0.03));padding:12px;border-radius:var(--radius-sm, 10px);margin-bottom:16px;border:1px solid var(--border, #e5e7eb);">
      <div id="st-modal-img" style="width:68px;height:68px;border-radius:8px;overflow:hidden;background:var(--stage, #eee);flex-shrink:0;display:grid;place-items:center;"></div>
      <div style="min-width:0;flex:1;">
        <h4 id="st-modal-name" style="margin:0 0 4px;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></h4>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span id="st-modal-price" style="font-weight:700;color:var(--accent, #2563eb);font-size:15px;"></span>
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" id="st-qty-minus" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border, #ccc);background:var(--surface, #fff);cursor:pointer;font-weight:bold;color:var(--text, #111);">-</button>
            <span id="st-modal-qty" style="font-weight:700;font-size:14px;min-width:20px;text-align:center;">1</span>
            <button type="button" id="st-qty-plus" style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border, #ccc);background:var(--surface, #fff);cursor:pointer;font-weight:bold;color:var(--text, #111);">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Options Selector (Couleurs, Tailles...) -->
    <div id="st-modal-options" style="display:none;margin-bottom:16px;padding:12px;border-radius:var(--radius-sm, 10px);background:var(--ship-bg, rgba(0,0,0,0.02));border:1px solid var(--border, #e5e7eb);"></div>

    <!-- Customer Form -->
    <form id="st-checkout-form" style="display:grid;gap:12px;">
      <div>
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text, #111);">Nom et Prénom *</label>
        <input type="text" id="st-cust-name" required placeholder="Votre nom complet" style="width:100%;height:42px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
      </div>

      <div>
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text, #111);">Numéro de téléphone *</label>
        <input type="tel" id="st-cust-phone" required placeholder="0555 12 34 56" style="width:100%;height:42px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
      </div>

      <div>
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text, #111);">Wilaya de livraison *</label>
        <select id="st-cust-wilaya" required style="width:100%;height:42px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;">
          <option value="">Sélectionnez votre wilaya</option>
        </select>
      </div>

      <div style="display:flex;gap:10px;margin-top:2px;">
        <label style="flex:1;display:flex;align-items:center;gap:6px;font-size:13px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;cursor:pointer;background:var(--surface, #fff);color:var(--text, #111);">
          <input type="radio" name="st_ship_mode" value="domicile" checked /> À domicile
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:6px;font-size:13px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;cursor:pointer;background:var(--surface, #fff);color:var(--text, #111);">
          <input type="radio" name="st_ship_mode" value="stopdesk" /> Stop Desk (Bureau)
        </label>
      </div>

      <div>
        <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text, #111);">Adresse exacte (commune, quartier...)</label>
        <input type="text" id="st-cust-addr" placeholder="Ex: Bab Ezzouar, Cité 500 logts" style="width:100%;height:42px;padding:8px 12px;border:1px solid var(--border, #ccc);border-radius:8px;background:var(--surface, #fff);color:var(--text, #111);font-size:14px;box-sizing:border-box;" />
      </div>

      <!-- Price Breakdown -->
      <div style="border-top:1px dashed var(--border, #ccc);padding-top:10px;margin-top:4px;font-size:13px;display:grid;gap:4px;">
        <div style="display:flex;justify-content:space-between;color:var(--muted, #666);">
          <span>Sous-total</span><span id="st-breakdown-sub">0 DA</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--muted, #666);">
          <span>Livraison</span><span id="st-breakdown-ship">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;color:var(--text, #111);margin-top:4px;">
          <span>Total à la livraison</span><span id="st-breakdown-total" style="color:var(--accent, #2563eb);">0 DA</span>
        </div>
      </div>

      <div id="st-modal-alert" style="display:none;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:4px;text-align:center;"></div>

      <button type="submit" id="st-submit-btn" class="pd-btn pd-btn--buy" style="margin-top:8px;padding:12px;font-size:15px;font-weight:700;border:none;cursor:pointer;width:100%;border-radius:var(--btn-radius, 8px);">
        Confirmer la commande
      </button>
    </form>
  </div>
</div>

<script>
(function() {{
  var storeId = "{store_id}";
  var rawWilayas = {wilayas_json_str};
  var wilayasMap = {{}};
  var selWilaya = document.getElementById("st-cust-wilaya");

  if (selWilaya) {{
    rawWilayas.forEach(function(w) {{
      wilayasMap[w[1]] = {{ id: w[0], name: w[1], home: w[2], desk: w[3] }};
      var opt = document.createElement("option");
      opt.value = w[1];
      opt.textContent = w[0] + ". " + w[1];
      selWilaya.appendChild(opt);
    }});
  }}

  try {{
    fetch("https://lyntwhvvnklmcprnnump.supabase.co/rest/v1/shipping_rates?store_id=eq." + storeId + "&select=wilaya_id,price_home,price_desk", {{
      headers: {{
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bnR3aHZ2bmtsbWNwcm5udW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzUwOTksImV4cCI6MjEwNTM1MTA5OX0.-X3fmDagUiluvTDU6wY7UBwNll0-Bsu7gJ54uhL77PQ",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bnR3aHZ2bmtsbWNwcm5udW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzUwOTksImV4cCI6MjEwNTM1MTA5OX0.-X3fmDagUiluvTDU6wY7UBwNll0-Bsu7gJ54uhL77PQ"
      }}
    }})
    .then(function(r) {{ return r.json(); }})
    .then(function(customRates) {{
      if (Array.isArray(customRates) && customRates.length > 0) {{
        customRates.forEach(function(cr) {{
          for (var k in wilayasMap) {{
            if (wilayasMap[k].id === cr.wilaya_id) {{
              wilayasMap[k].home = cr.price_home;
              wilayasMap[k].desk = cr.price_desk;
              break;
            }}
          }}
        }});
        updateTotals();
      }}
    }})
    .catch(function() {{}});
  }} catch (e) {{}}

  var modal = document.getElementById("st-checkout-modal");
  var closeBtn = document.getElementById("st-close-modal");
  var currentProduct = null;
  var currentQty = 1;

  function formatMoney(n) {{
    return new Intl.NumberFormat("fr-DZ").format(Math.round(n)) + " DA";
  }}

  function updateTotals() {{
    if (!currentProduct) return;
    var sub = currentProduct.price * currentQty;
    document.getElementById("st-breakdown-sub").textContent = formatMoney(sub);

    var wName = selWilaya ? selWilaya.value : "";
    var mode = (document.querySelector('input[name="st_ship_mode"]:checked') || {{}}).value || "domicile";
    var shipCost = 0;
    if (wName && wilayasMap[wName]) {{
      shipCost = mode === "stopdesk" ? wilayasMap[wName].desk : wilayasMap[wName].home;
      document.getElementById("st-breakdown-ship").textContent = formatMoney(shipCost);
    }} else {{
      document.getElementById("st-breakdown-ship").textContent = "Sélectionnez wilaya";
    }}

    document.getElementById("st-breakdown-total").textContent = formatMoney(sub + shipCost);
  }}

  document.querySelectorAll(".st-open-checkout").forEach(function(btn) {{
    btn.addEventListener("click", function(e) {{
      e.preventDefault();
      e.stopPropagation();
      currentProduct = {{
        id: btn.dataset.pid || "",
        name: btn.dataset.pname || "Produit",
        price: parseInt(btn.dataset.price, 10) || 0,
        img: btn.dataset.pimg || "",
        cat: btn.dataset.pcat || "",
        options: [],
        selectedOptions: {{}}
      }};
      try {{
        currentProduct.options = JSON.parse(btn.dataset.popts || "[]");
      }} catch (err) {{
        currentProduct.options = [];
      }}
      currentQty = 1;

      document.getElementById("st-modal-name").textContent = currentProduct.name;
      document.getElementById("st-modal-price").textContent = formatMoney(currentProduct.price);
      document.getElementById("st-modal-qty").textContent = "1";

      var imgContainer = document.getElementById("st-modal-img");
      if (currentProduct.img) {{
        imgContainer.innerHTML = '<img src="' + currentProduct.img + '" style="width:100%;height:100%;object-fit:cover;" />';
      }} else {{
        imgContainer.innerHTML = '<span style="font-size:32px;">🛍️</span>';
      }}

      // Rendu dynamique des options de variantes (couleurs, tailles...)
      var optsContainer = document.getElementById("st-modal-options");
      if (optsContainer) {{
        optsContainer.innerHTML = "";
        if (Array.isArray(currentProduct.options) && currentProduct.options.length > 0) {{
          optsContainer.style.display = "grid";
          optsContainer.style.gap = "12px";

          currentProduct.options.forEach(function(opt, optIdx) {{
            var optName = opt.name || ("Option " + (optIdx + 1));
            var optType = opt.type || "chip";
            var vals = opt.values || [];
            if (!vals || vals.length === 0) return;

            var firstAvail = vals.find(function(v) {{ return v.available !== false; }}) || vals[0];
            var currentVal = firstAvail ? firstAvail.label : "";
            currentProduct.selectedOptions[optName] = currentVal;

            var fieldDiv = document.createElement("div");
            fieldDiv.className = "pd-field";
            fieldDiv.style.margin = "0";

            var labelP = document.createElement("p");
            labelP.className = "pd-label";
            labelP.style.display = "flex";
            labelP.style.justifyContent = "space-between";
            labelP.style.alignItems = "center";
            labelP.style.fontSize = "13px";
            labelP.style.fontWeight = "600";
            labelP.style.margin = "0 0 7px 0";
            labelP.style.color = "var(--text, #111)";

            var titleSpan = document.createElement("span");
            titleSpan.textContent = optName;

            var valSpan = document.createElement("span");
            valSpan.id = "st-val-" + optIdx;
            valSpan.style.fontWeight = "600";
            valSpan.style.color = "var(--accent, #2563eb)";
            valSpan.style.fontSize = "12.5px";
            valSpan.textContent = currentVal;

            labelP.appendChild(titleSpan);
            labelP.appendChild(valSpan);
            fieldDiv.appendChild(labelP);

            var optsDiv = document.createElement("div");
            optsDiv.className = "pd-opts";
            optsDiv.style.display = "flex";
            optsDiv.style.gap = "8px";
            optsDiv.style.flexWrap = "wrap";
            optsDiv.style.alignItems = "center";

            vals.forEach(function(v) {{
              var isAvail = v.available !== false;
              var isSelected = v.label === currentVal;

              if (optType === "swatch") {{
                var swatchBtn = document.createElement("button");
                swatchBtn.type = "button";
                swatchBtn.className = "pd-swatch";
                swatchBtn.setAttribute("aria-pressed", isSelected ? "true" : "false");
                swatchBtn.title = v.label;
                swatchBtn.style.background = v.hex || "#3b82f6";
                swatchBtn.style.width = "34px";
                swatchBtn.style.height = "34px";
                swatchBtn.style.borderRadius = "50%";
                swatchBtn.style.cursor = isAvail ? "pointer" : "not-allowed";
                swatchBtn.style.border = isSelected ? "2.5px solid var(--accent, #2563eb)" : "2px solid var(--border, #ccc)";
                swatchBtn.style.boxShadow = isSelected ? "0 0 0 3px var(--accent-soft, rgba(37,99,235,0.2))" : "none";
                swatchBtn.style.transition = "all 0.15s ease";
                if (!isAvail) {{
                  swatchBtn.disabled = true;
                  swatchBtn.style.opacity = "0.35";
                }}
                swatchBtn.addEventListener("click", function(ev) {{
                  ev.preventDefault();
                  currentProduct.selectedOptions[optName] = v.label;
                  valSpan.textContent = v.label;
                  optsDiv.querySelectorAll(".pd-swatch").forEach(function(sb) {{
                    sb.setAttribute("aria-pressed", "false");
                    sb.style.border = "2px solid var(--border, #ccc)";
                    sb.style.boxShadow = "none";
                  }});
                  swatchBtn.setAttribute("aria-pressed", "true");
                  swatchBtn.style.border = "2.5px solid var(--accent, #2563eb)";
                  swatchBtn.style.boxShadow = "0 0 0 3px var(--accent-soft, rgba(37,99,235,0.2))";
                }});
                optsDiv.appendChild(swatchBtn);
              }} else {{
                var chipBtn = document.createElement("button");
                chipBtn.type = "button";
                chipBtn.className = "pd-chip";
                chipBtn.setAttribute("aria-pressed", isSelected ? "true" : "false");
                chipBtn.textContent = v.label;
                chipBtn.style.padding = "6px 14px";
                chipBtn.style.fontSize = "13px";
                chipBtn.style.fontWeight = "600";
                chipBtn.style.borderRadius = "8px";
                chipBtn.style.cursor = isAvail ? "pointer" : "not-allowed";
                chipBtn.style.border = isSelected ? "1.5px solid var(--accent, #2563eb)" : "1.5px solid var(--border, #ccc)";
                chipBtn.style.background = isSelected ? "var(--accent-soft, #eff6ff)" : "var(--surface, #fff)";
                chipBtn.style.color = isSelected ? "var(--accent, #2563eb)" : "var(--text, #111)";
                chipBtn.style.transition = "all 0.15s ease";
                if (!isAvail) {{
                  chipBtn.disabled = true;
                  chipBtn.style.opacity = "0.35";
                  chipBtn.style.textDecoration = "line-through";
                }}
                chipBtn.addEventListener("click", function(ev) {{
                  ev.preventDefault();
                  currentProduct.selectedOptions[optName] = v.label;
                  valSpan.textContent = v.label;
                  optsDiv.querySelectorAll(".pd-chip").forEach(function(cb) {{
                    cb.setAttribute("aria-pressed", "false");
                    cb.style.border = "1.5px solid var(--border, #ccc)";
                    cb.style.background = "var(--surface, #fff)";
                    cb.style.color = "var(--text, #111)";
                  }});
                  chipBtn.setAttribute("aria-pressed", "true");
                  chipBtn.style.border = "1.5px solid var(--accent, #2563eb)";
                  chipBtn.style.background = "var(--accent-soft, #eff6ff)";
                  chipBtn.style.color = "var(--accent, #2563eb)";
                }});
                optsDiv.appendChild(chipBtn);
              }}
            }});
            fieldDiv.appendChild(optsDiv);
            optsContainer.appendChild(fieldDiv);
          }});
        }} else {{
          optsContainer.style.display = "none";
        }}
      }}

      var alertBox = document.getElementById("st-modal-alert");
      if (alertBox) alertBox.style.display = "none";

      updateTotals();
      if (modal) modal.style.display = "flex";
    }});
  }});

  if (closeBtn) {{
    closeBtn.addEventListener("click", function() {{
      if (modal) modal.style.display = "none";
    }});
  }}

  if (modal) {{
    modal.addEventListener("click", function(e) {{
      if (e.target === modal) modal.style.display = "none";
    }});
  }}

  var minusBtn = document.getElementById("st-qty-minus");
  var plusBtn = document.getElementById("st-qty-plus");

  if (minusBtn) {{
    minusBtn.addEventListener("click", function() {{
      if (currentQty > 1) {{
        currentQty--;
        document.getElementById("st-modal-qty").textContent = currentQty;
        updateTotals();
      }}
    }});
  }}

  if (plusBtn) {{
    plusBtn.addEventListener("click", function() {{
      currentQty++;
      document.getElementById("st-modal-qty").textContent = currentQty;
      updateTotals();
    }});
  }}

  if (selWilaya) selWilaya.addEventListener("change", updateTotals);
  document.querySelectorAll('input[name="st_ship_mode"]').forEach(function(r) {{
    r.addEventListener("change", updateTotals);
  }});

  var form = document.getElementById("st-checkout-form");
  if (form) {{
    form.addEventListener("submit", function(e) {{
      e.preventDefault();
      var alertBox = document.getElementById("st-modal-alert");
      var submitBtn = document.getElementById("st-submit-btn");

      var nameVal = (document.getElementById("st-cust-name").value || "").trim();
      var phoneVal = (document.getElementById("st-cust-phone").value || "").replace(/\\D/g, "");
      var wilayaVal = selWilaya ? selWilaya.value : "";
      var addrVal = (document.getElementById("st-cust-addr").value || "").trim();
      var mode = (document.querySelector('input[name="st_ship_mode"]:checked') || {{}}).value || "domicile";

      if (!wilayaVal) {{
        alertBox.style.display = "block";
        alertBox.style.background = "#fee2e2";
        alertBox.style.color = "#991b1b";
        alertBox.textContent = "Veuillez sélectionner votre wilaya de livraison.";
        return;
      }}

      if (!nameVal || nameVal.length < 2) {{
        alertBox.style.display = "block";
        alertBox.style.background = "#fee2e2";
        alertBox.style.color = "#991b1b";
        alertBox.textContent = "Veuillez entrer votre nom complet.";
        return;
      }}

      if (!phoneVal || phoneVal.length < 9) {{
        alertBox.style.display = "block";
        alertBox.style.background = "#fee2e2";
        alertBox.style.color = "#991b1b";
        alertBox.textContent = "Veuillez entrer un numéro de téléphone valide (9 chiffres minimum).";
        return;
      }}

      var shipCost = wilayasMap[wilayaVal] ? (mode === "stopdesk" ? wilayasMap[wilayaVal].desk : wilayasMap[wilayaVal].home) : 0;
      var totalAmount = (currentProduct.price * currentQty) + shipCost;
      var fullAddress = "Wilaya: " + wilayaVal + " (" + (mode === "stopdesk" ? "Stop Desk" : "À domicile") + ")" + (addrVal ? " — " + addrVal : "");

      var selectedOpts = (currentProduct && currentProduct.selectedOptions) || {{}};

      var payload = {{
        store_id: storeId,
        customer_name: nameVal,
        customer_phone: phoneVal,
        customer_address: fullAddress,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        items: [{{
          product_id: currentProduct.id,
          name: currentProduct.name,
          price: currentProduct.price,
          quantity: currentQty,
          options_selected: selectedOpts
        }}],
        notes: null
      }};

      var origBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.75";
      submitBtn.innerHTML = "Enregistrement en cours...";

      var supabaseUrl = "https://lyntwhvvnklmcprnnump.supabase.co";
      var supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bnR3aHZ2bmtsbWNwcm5udW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NzUwOTksImV4cCI6MjEwNTM1MTA5OX0.-X3fmDagUiluvTDU6wY7UBwNll0-Bsu7gJ54uhL77PQ";

      // Direct Supabase insert
      fetch(supabaseUrl + "/rest/v1/orders", {{
        method: "POST",
        headers: {{
          "apikey": supabaseAnonKey,
          "Authorization": "Bearer " + supabaseAnonKey,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        }},
        body: JSON.stringify(payload)
      }})
      .then(function(res) {{
        if (res.ok) {{
          alertBox.style.display = "block";
          alertBox.style.background = "#dcfce7";
          alertBox.style.color = "#166534";
          alertBox.innerHTML = "🎉 <b>Commande validée avec succès !</b><br>Notre équipe vous appellera pour confirmer la livraison.";
          form.reset();
          setTimeout(function() {{
            if (modal) modal.style.display = "none";
          }}, 2800);
        }} else {{
          throw new Error("Erreur insertion Supabase");
        }}
      }})
      .catch(function(err) {{
        console.warn("Fallback to platform orders API...", err);
        return fetch("/api/orders", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify(payload)
        }})
        .then(function(fb) {{
          if (fb.ok) {{
            alertBox.style.display = "block";
            alertBox.style.background = "#dcfce7";
            alertBox.style.color = "#166534";
            alertBox.innerHTML = "🎉 <b>Commande validée avec succès !</b><br>Notre équipe vous appellera pour confirmer la livraison.";
            form.reset();
            setTimeout(function() {{
              if (modal) modal.style.display = "none";
            }}, 2800);
          }} else {{
            alertBox.style.display = "block";
            alertBox.style.background = "#fee2e2";
            alertBox.style.color = "#991b1b";
            alertBox.textContent = "Erreur lors de l'envoi. Veuillez réessayer ou contacter la boutique.";
          }}
        }});
      }})
      .finally(function() {{
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.innerHTML = origBtnText;
      }});
    }});
  }}
}})();
</script>
'''
                if '</body>' in content:
                    content = content.replace('</body>', f'{boutique_modal_html}</body>')
                else:
                    content += boutique_modal_html

                return content
        except Exception as e:
            logger.error(f"Error rendering ready template {theme}: {e}")
            return None

    async def generate_store(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        store = store_data.get("store", {})
        products = store_data.get("products", [])
        style = store_data.get("style_preferences", {})
        seo = store_data.get("seo", {})
        slogan = store_data.get("slogan", "")
        store_id = store.get("id")

        theme_key = store.get("theme", "modern")

        # When creating stores or funnels from ready templates, render the exact chosen template
        rendered_html = self._render_ready_template(store_data)
        if rendered_html:
            logger.info("Using pixel-perfect ready template for theme=%s type=%s", theme_key, store.get("type"))
            return {
                "success": True,
                "html": rendered_html,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
        anim_key = store.get("animation_style", "soft")
        theme_tokens = THEME_DESIGN_TOKENS.get(theme_key, THEME_DESIGN_TOKENS["modern"])
        anim_desc = ANIMATION_STYLES.get(anim_key, ANIMATION_STYLES["soft"])

        requested_effects = style.get("effects", [])
        effects_block = "\n".join(
            f"- {EFFECTS_INSTRUCTIONS[e]}" for e in requested_effects if e in EFFECTS_INSTRUCTIONS
        )

        products_for_prompt = []
        for p in products:
            products_for_prompt.append({
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "price": p.get("price", 0),
                "original_price": p.get("original_price"),
                "images": [img.get("url", img) if isinstance(img, dict) else img for img in p.get("images", [])],
                "category": p.get("category", ""),
                "is_featured": p.get("is_featured", False),
            })

        system_prompt = f"""Tu es un développeur full-stack senior, expert en e-commerce, HTML5, CSS3, JavaScript vanilla, et design UI/UX premium.

MISSION : Générer un fichier HTML UNIQUE, 100% autonome (self-contained), pour une boutique e-commerce algérienne.
Le fichier doit contenir TOUT le CSS et JS en inline (dans <style> et <script>). AUCUNE dépendance externe sauf Google Fonts et optionnellement GSAP via CDN.

DESIGN :
- Thème : "{theme_key}" → {theme_tokens['vibe']}
- Couleur primaire de la marque : {store.get('primary_color', '#534AB7')}
- Background : {theme_tokens['bg']}, Cards : {theme_tokens['card_bg']}, Texte : {theme_tokens['text']}
- Style visuel : {theme_tokens['accent_style']}
- Police personnalisée : {style.get('font', 'Inter')} (import Google Fonts)

ANIMATIONS :
{anim_desc}
{('EFFETS SPÉCIAUX DEMANDÉS :' + chr(10) + effects_block) if effects_block else ''}

MONNAIE : Tous les prix sont en DZD (Dinar Algérien). Formater : "X DA" ou "X,XX DA".

COMMANDE & PAIEMENT À LA LIVRAISON (COD) :
- Le bouton principal "Commander" ne doit PAS rediriger vers WhatsApp. Il doit ouvrir le formulaire ou la modale de commande Cash on Delivery.
- Le formulaire collecte : Nom complet, Téléphone valide, Wilaya (liste déroulante 58 wilayas d'Algérie) et Adresse de livraison.
- L'enregistrement se fait en direct. Un lien de contact WhatsApp ({store.get('whatsapp_phone', '')}) reste accessible en bas de page ou en contact direct.

CONTRAINTES STRICTES :
1. Réponds UNIQUEMENT avec le code HTML complet. Pas de commentaires, pas d'explications.
2. Le HTML doit commencer par <!DOCTYPE html> et finir par </html>.
3. Pas de Tailwind CDN. CSS pur inline dans <style>.
4. Mobile-first : le design doit être parfait sur mobile (360px) puis s'adapter aux tablettes et desktop.
5. Performance : pas de librairies lourdes. JS vanilla uniquement (GSAP CDN autorisé si animation_style est "dynamic" ou "spectacular").
6. Accessibilité : aria-labels sur boutons, alt sur images, contraste suffisant.
7. Le code JS doit être robuste : pas d'erreurs console, gestion des cas limites (panier vide, etc.)."""

        prompt = f"""Génère le fichier HTML complet pour cette boutique :

═══ INFORMATIONS BOUTIQUE ═══
Nom : {store.get('name', 'Ma Boutique')}
Description : {store.get('description', '')}
Catégorie : {store.get('category', 'Général')}
Logo URL : {store.get('logo_url', '')}
Slogan : {slogan or 'Bienvenue dans notre boutique'}
WhatsApp : {store.get('whatsapp_phone', '')}

═══ SEO ═══
Title : {seo.get('title', store.get('name', 'Boutique en ligne'))}
Meta description : {seo.get('description', store.get('description', ''))}
Keywords : {seo.get('keywords', store.get('category', ''))}

═══ SECTIONS REQUISES (dans cet ordre) ═══

1. **HEADER / NAVBAR**
   - Logo (image si logo_url fourni, sinon texte du nom)
   - Navigation : Accueil, Produits, Contact
   - Icône panier avec badge compteur (nombre d'articles)
   - Sticky en haut, blur background

2. **HERO SECTION**
   - Grand titre animé avec le nom de la boutique
   - Sous-titre : slogan ou description
   - Bouton CTA "Voir les produits" (scroll vers catalogue)
   - Background visuel cohérent avec le thème
   - Hauteur : min 80vh sur mobile, 70vh sur desktop

3. **CATALOGUE PRODUITS**
   - Grille responsive : 1 col mobile, 2 cols tablette, 3-4 cols desktop
   - Filtrage par catégorie (boutons de filtre en haut)
   - Chaque card : image, nom, prix (ancien prix barré si promo), badge "Promo" si original_price, bouton "Commander" (ouvre le checkout) et "Ajouter au panier"
   - Produits featured en premier avec badge "Vedette"
   - Hover effects sur les cards

4. **MODAL DÉTAIL PRODUIT**
   - S'ouvre au clic sur un produit
   - Image grande, nom, description longue, prix
   - Sélecteur de quantité (+/-)
   - Bouton "Commander maintenant" et "Ajouter au panier"
   - Fermeture par X, clic extérieur, ou Escape

5. **PANIER & COMMANDE (MODAL OU DRAWER)**
   - S'ouvre depuis l'icône panier ou au clic sur Commander
   - Récapitulatif des articles avec quantité et total en DZD
   - Formulaire COD : Nom, Téléphone, Wilaya (58 wilayas), Adresse
   - Bouton "Confirmer la commande"
   - Persistance localStorage (le panier survit au refresh)

6. **FOOTER**
   - Nom de la boutique, description courte
   - Lien WhatsApp direct
   - "© {datetime.now().year} {{nom_boutique}} — Tous droits réservés"
   - Style cohérent avec le thème

═══ DONNÉES PRODUITS (JSON) ═══
{json.dumps(products_for_prompt, ensure_ascii=False, indent=2)}

═══ RAPPELS TECHNIQUES ═══
- Tout le CSS dans UNE SEULE balise <style> dans le <head>
- Tout le JS dans UNE SEULE balise <script> avant </body>
- Le JS du panier utilise localStorage avec la clé "cart_{{store_slug}}"
- OpenGraph tags : og:title, og:description, og:image (première image produit), og:type="website"
- Charset UTF-8, viewport meta tag
- Favicon : emoji ou SVG inline

Génère le code HTML complet maintenant."""

        try:
            raw_html, usage = await self._call_gemini(
                prompt,
                system_prompt,
                max_tokens=16384,
                method_name="generate_store",
                store_id=store_id,
            )
            clean_html = self._strip_code_fences(raw_html)

            return {
                "success": True,
                "html": clean_html,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "usage": usage,
            }

        except Exception as e:
            logger.error(f"Génération IA échouée, fallback template: {e}")
            return {
                "success": False,
                "html": self._get_fallback_template(store, products),
                "error": f"Génération IA échouée après 3 tentatives: {str(e)}",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

    async def generate_seo(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        store = store_data.get("store", {})
        products = store_data.get("products", [])
        store_id = store.get("id")

        categories = list({p.get("category", "") for p in products if p.get("category")})

        system = """Tu es un expert SEO spécialisé en e-commerce.
Tu génères UNIQUEMENT un objet JSON valide, sans commentaires, sans explications.
Le JSON doit être parseable directement par json.loads()."""

        prompt = f"""Génère les métadonnées SEO pour cette boutique algérienne :

Nom : {store.get('name')}
Description : {store.get('description', '')}
Catégorie principale : {store.get('category', 'Général')}
Catégories produits : {', '.join(categories)}
Nombre de produits : {len(products)}

Génère ce JSON exact :
{{
  "title": "titre SEO (max 60 caractères, inclut le nom de la boutique)",
  "description": "méta-description (max 155 caractères, vendeuse et avec mots-clés)",
  "og_title": "titre Open Graph (peut être légèrement différent, max 60 car.)",
  "og_description": "description OG (max 200 car., engageante)",
  "keywords": "mot1, mot2, mot3, ... (10 mots-clés pertinents séparés par virgules)"
}}"""

        try:
            text, _ = await self._call_gemini(
                prompt, system, max_tokens=500,
                method_name="generate_seo", store_id=store_id,
            )
            clean = text.strip()
            if clean.startswith("```"):
                clean = self._strip_code_fences(clean)
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("SEO JSON invalide, extraction par heuristique")
            try:
                start = text.index("{")
                end = text.rindex("}") + 1
                return json.loads(text[start:end])
            except Exception:
                pass
            return {
                "title": store.get("name", "Boutique en ligne"),
                "description": store.get("description", ""),
                "og_title": store.get("name", ""),
                "og_description": store.get("description", ""),
                "keywords": store.get("category", ""),
            }
        except Exception:
            return {
                "title": store.get("name", "Boutique en ligne"),
                "description": store.get("description", ""),
                "og_title": store.get("name", ""),
                "og_description": store.get("description", ""),
                "keywords": store.get("category", ""),
            }

    async def generate_product_descriptions(
        self, products: List[Dict], store_id: Optional[str] = None
    ) -> List[Dict]:
        system = """Tu es un copywriter e-commerce expert. Tu écris des descriptions de produits
courtes, vendeuses et professionnelles en français.
Réponds UNIQUEMENT avec le texte de la description, rien d'autre.
Maximum 200 caractères. Style engageant et persuasif."""

        async def _improve_one(product: Dict) -> Dict:
            prompt = f"""Améliore cette description de produit :

Nom : {product.get('name', '')}
Prix : {product.get('price', 0)} DA
Catégorie : {product.get('category', '')}
Description actuelle : {product.get('description', 'Aucune')}

Écris une description vendeuse de max 200 caractères."""

            try:
                new_desc, _ = await self._call_gemini(
                    prompt, system, max_tokens=300,
                    method_name="generate_product_description",
                    store_id=store_id,
                )
                return {**product, "description": new_desc.strip()}
            except Exception:
                return product

        results = await asyncio.gather(
            *(_improve_one(p) for p in products),
            return_exceptions=True,
        )

        return [
            r if isinstance(r, dict) else products[i]
            for i, r in enumerate(results)
        ]

    async def generate_slogan(self, store_data: Dict[str, Any]) -> str:
        store = store_data.get("store", {})

        system = """Tu es un expert en branding et marketing.
Réponds UNIQUEMENT avec le slogan, rien d'autre. Pas de guillemets.
Le slogan doit être en français, accrocheur et mémorable."""

        prompt = f"""Génère un slogan accrocheur et court (maximum 10 mots) pour :

Boutique : {store.get('name', '')}
Catégorie : {store.get('category', '')}
Description : {store.get('description', '')}
Thème visuel : {store.get('theme', 'modern')}

Le slogan doit refléter l'identité de la boutique et donner envie d'acheter."""

        try:
            text, _ = await self._call_gemini(
                prompt, system, max_tokens=100,
                method_name="generate_slogan",
                store_id=store.get("id"),
            )
            clean = text.strip().strip('"').strip("'").strip("«").strip("»")
            return clean
        except Exception:
            return "Qualité & élégance à portée de clic"

    def _get_fallback_template(
        self, store: Dict[str, Any], products: List[Dict], style: Dict[str, Any] = None, seo: Dict[str, Any] = None, slogan: str = ""
    ) -> str:
        # Try pixel-perfect ready template first
        ready = self._render_ready_template({"store": store, "products": products, "seo": seo or {}, "slogan": slogan})
        if ready:
            return ready

        # ── None-safe extraction ──────────────────────────────────────────────────
        # Supabase returns NULL columns as Python `None`, and `dict.get(key, default)`
        # only returns `default` when the key is MISSING — not when the value is
        # explicitly `None`. The previous version of this function crashed with
        # `'NoneType' object has no attribute 'replace'` whenever a field like
        # `description`, `name`, or `primary_color` was NULL. The helper below
        # treats `None` and "" as missing and falls back to the provided default.
        def _s(value: Any, default: str) -> str:
            return default if value in (None, "") else str(value)

        def _js_safe_json(value: Any) -> str:
            """json.dumps safe to embed inside an inline <script>.

            Python's json.dumps does NOT escape `<`, `>`, `&` or U+2028/U+2029,
            so a product name/description containing `</script>` would terminate
            the script tag early and either break the deployed storefront or
            inject arbitrary JavaScript into it (stored-XSS). Escaping to the
            \\uXXXX forms keeps the JSON valid and makes the payload inert.
            """
            return (
                json.dumps(value, ensure_ascii=False)
                .replace("<", "\\u003c")
                .replace(">", "\\u003e")
                .replace("&", "\\u0026")
                .replace("\u2028", "\\u2028")
                .replace("\u2029", "\\u2029")
            )

        def _price_int(value: Any) -> int:
            """Robust numeric coercion for display. Prices arrive from Supabase as
            int, float, Decimal or a formatted string; a hostile value must never
            bubble an exception up (that would degrade the whole deploy to a bare
            HTML page)."""
            try:
                return int(float(value))
            except (TypeError, ValueError):
                return 0

        name    = html_module.escape(_s(store.get("name"), "Ma Boutique"))
        desc    = html_module.escape(_s(store.get("description"), "Bienvenue dans notre boutique."))
        color   = _s(store.get("primary_color"), "#534AB7")
        phone   = _s(store.get("whatsapp_phone"), "")
        slug    = _s(store.get("slug"), "boutique")
        anim    = _s(store.get("animation_style"), "soft")

        style_prefs = style or {}
        seo_data = seo or {}
        slogan_text = _s(slogan, "")

        theme_key = _s(store.get("theme"), "modern")
        theme_tokens = THEME_DESIGN_TOKENS.get(theme_key, THEME_DESIGN_TOKENS["modern"])
        bg_color = theme_tokens["bg"]
        card_color = theme_tokens["card_bg"]
        text_color = theme_tokens["text"]

        hero_gradient = f"linear-gradient(135deg, {color}, #1e293b)"

        # ── None-safe product list ────────────────────────────────────────────────
        products_json_items = []
        for i, p in enumerate(products or []):
            p_price = p.get("price") or 0
            images = p.get("images") or []
            p_img = ""
            if images and images[0] is not None:
                first = images[0]
                p_img = first.get("url", first) if isinstance(first, dict) else first
            p_img = _s(p_img, "")

            # Stock: accept both `stock_quantity` (canonical, from Supabase) and
            # the legacy `stock` key the template used before the refactor.
            # Missing/NULL stock is treated as in-stock with qty 1 — never block
            # the buy button over a missing field.
            stock_qty = p.get("stock_quantity", p.get("stock", 1))
            try:
                stock_qty = max(0, int(stock_qty or 0))
            except (TypeError, ValueError):
                stock_qty = 1
            if stock_qty == 0:
                stock_qty = 1  # never ship a product the client can't buy

            products_json_items.append({
                "id": str(p.get("id") if p.get("id") is not None else i),
                "name": _s(p.get("name"), f"Produit {i+1}"),
                "price": p_price,
                "image": p_img,
                "images": [img["url"] if isinstance(img, dict) and "url" in img
                           else img for img in (p.get("images") or []) if img],
                "description": _s(p.get("description"), ""),
                "original_price": p.get("original_price"),
                "category": _s(p.get("category"), ""),
                "is_featured": bool(p.get("is_featured", False)),
                "stock_quantity": stock_qty,
                "sku": _s(p.get("sku"), ""),
                "variants": p.get("variants") if isinstance(p.get("variants"), list) else [],
            })

        products_json = _js_safe_json(products_json_items)

        # Inject a single, well-formed store metadata blob so the storefront
        # runtime (storefront.js) has one source of truth instead of half a
        # dozen scattered {{ }} substitutions. Raw (unescaped) values: any
        # place that renders STORE_DATA to HTML escapes on output, and putting
        # HTML entities here would leak "&amp;" into cart toasts / WhatsApp
        # messages for stores whose name contains an ampersand.
        store_data = {
            "id":                 _s(store.get("id"), ""),
            "name":               _s(store.get("name"), "Ma Boutique"),
            "slug":               slug,
            "whatsapp_phone":     phone,
            "description":        _s(store.get("description"), "Bienvenue dans notre boutique."),
            "primary_color":      color,
            "theme":              theme_key,
            "animation_style":    anim,
            "api_url":            _s(store.get("api_url"), "http://127.0.0.1:8000"),
            "currency":           _s(store.get("currency"), "DZD"),
            "slogan":             _s(slogan_text or store.get("slogan"), ""),
            "delivery_zones":     store.get("delivery_zones") or [],
            "custom_domain":      _s(store.get("custom_domain"), ""),
            "facebook_pixel_id":  _s(store.get("facebook_pixel_id"), ""),
            "tiktok_pixel_id":    _s(store.get("tiktok_pixel_id"), ""),
            "payment_settings":   store.get("payment_settings") or {
                "cod_enabled": True,
                "baridimob_enabled": False,
                "baridimob_rip": "",
                "baridimob_name": "",
                "stripe_enabled": False,
            },
        }
        store_data_json = _js_safe_json(store_data)

        templates_base = os.path.join(os.path.dirname(__file__), "..", "..", "store-template", "templates")
        folder_mapping = {
            "pantry-basics": "01-pantry-basics",
            "pantry": "01-pantry-basics",
            "fashion-modern": "01-pantry-basics",
            "Moderne": "01-pantry-basics",
            "modern": "01-pantry-basics",

            "habitat-occasions": "02-habitat-occasions",
            "habitat": "02-habitat-occasions",
            "single-product-cod": "02-habitat-occasions",
            "Direct COD": "02-habitat-occasions",

            "botanica-organic": "03-botanica-organic",
            "botanica": "03-botanica-organic",
            "artisanal-dz": "03-botanica-organic",
            "Bio & Nature": "03-botanica-organic",
            "nature": "03-botanica-organic",

            "circuit-performance": "04-circuit-performance",
            "circuit": "04-circuit-performance",
            "tech-dark": "04-circuit-performance",
            "Tech DZ": "04-circuit-performance",
            "tech": "04-circuit-performance",

            "atelier-editorial": "05-atelier-editorial",
            "atelier": "05-atelier-editorial",
            "luxury-beauty": "05-atelier-editorial",
            "Luxe DZ": "05-atelier-editorial",
            "luxury": "05-atelier-editorial",

            "neo-brutalist": "06-neo-brutalist",
            "tuareg-indigo": "07-tuareg-indigo",
            "energetic": "08-energetic",
            "natural": "09-natural",
            "luxe-noir": "10-luxe-noir",
        }
        chosen_folder = folder_mapping.get(theme_key, folder_mapping.get(store.get("template_id"), ""))
        custom_tpl = os.path.join(templates_base, chosen_folder, "template.html") if chosen_folder else ""
        if custom_tpl and os.path.isfile(custom_tpl):
            template_path = custom_tpl
        else:
            template_path = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "reference-designs", "template.html")

        try:
            with open(template_path, "r", encoding="utf-8") as f:
                html_content = f.read()

            seo_description = html_module.escape(_s(seo_data.get("description"), desc))
            store_slogan = html_module.escape(slogan_text or desc)

            # ── Multi-Niche Adaptation Engine ────────────────────────────────
            niche_file = os.path.join(os.path.dirname(__file__), "..", "..", "store-template", "niche-content.json")
            niche_data = {}
            if os.path.isfile(niche_file):
                try:
                    with open(niche_file, "r", encoding="utf-8") as nf:
                        niche_data = json.load(nf)
                except Exception as ne:
                    logger.warning(f"Could not load niche-content.json: {ne}")

            raw_cat = _s(store.get("category"), "Autre / Général")
            niche = niche_data.get(raw_cat)
            if not niche:
                for k, v in niche_data.items():
                    if k.lower() in raw_cat.lower() or raw_cat.lower() in k.lower():
                        niche = v
                        break
            if not niche:
                niche = niche_data.get("Autre / Général", {})

            hero_kicker = html_module.escape(_s(niche.get("kicker"), "Collection 2026"))
            hero_title = html_module.escape(_s(niche.get("hero_title"), name))
            hero_subtitle = html_module.escape(_s(niche.get("hero_subtitle"), desc))
            section_title = html_module.escape(_s(niche.get("section_title"), "Nos Produits"))
            footer_about = html_module.escape(_s(niche.get("footer_about"), desc))
            niche_emoji = niche.get("default_emoji", "🛍️")

            niche_cats = niche.get("categories", ["Nouveautés", "Meilleures Ventes", "Promotions", "Tendances"])
            categories_links_html = "".join(
                f'<li><a href="#products-section">{html_module.escape(c)}</a></li>' for c in niche_cats
            )
            categories_chips_html = '<button class="chip on">Tous</button>' + "".join(
                f'<button class="chip">{html_module.escape(c)}</button>' for c in niche_cats
            )
            categories_grid_html = "".join(
                f'<a class="st-cat" href="#products-section">'
                f'<span class="st-cat__art"><div style="font-size:32px;display:grid;place-items:center;height:100%;">{niche_emoji}</div></span>'
                f'<span class="st-cat__label">{html_module.escape(c)}</span>'
                f'</a>'
                for c in niche_cats[:4]
            )

            trust_badges_list = niche.get("trust_badges", [
                {"title": "Paiement à la livraison", "desc": "Réglez à la réception sans acompte."},
                {"title": "Livraison 58 wilayas", "desc": "Expédition express partout en Algérie."},
                {"title": "Qualité garantie", "desc": "Satisfaction garantie ou retour sous 7 jours."}
            ])
            trust_badges_html = "".join(
                f'<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;flex:none;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>'
                f'<span><b>{html_module.escape(b.get("title", ""))}</b> {html_module.escape(b.get("desc", ""))}</span></li>'
                for b in trust_badges_list
            )

            # Generate product cards
            if products_json_items:
                cards_source = products_json_items
            else:
                cards_source = niche.get("demo_products", [
                    {"name": "Article Démo", "price": 3200, "category": "Article", "emoji": niche_emoji}
                ])

            products_cards_html_list = []
            for p_item in cards_source:
                p_name = html_module.escape(p_item.get("name", "Produit"))
                p_price = _price_int(p_item.get("price", 0))
                p_cat = html_module.escape(p_item.get("category", "Article"))
                p_img = p_item.get("image", "")
                p_emo = p_item.get("emoji", niche_emoji)
                name_js_safe = p_name.replace("'", "\\'")

                art_content = (
                    f'<img src="{p_img}" style="width:100%;height:100%;object-fit:cover;" alt="{p_name}" />'
                    if p_img else
                    f'<div style="font-size:42px;display:grid;place-items:center;width:100%;height:100%;">{p_emo}</div>'
                )

                card_markup = (
                    f'<div class="st-card" style="cursor:pointer;" onclick="openProductPage(\'{name_js_safe}\')">'
                    f'<span class="st-card__art">'
                    f'<span class="st-card__cat">{p_cat}</span>'
                    f'{art_content}'
                    f'</span>'
                    f'<span class="st-card__name">{p_name}</span>'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;">'
                    f'<span class="st-card__price">{p_price} DA</span>'
                    f'<button class="pd-btn pd-btn--buy" style="padding:6px 12px;font-size:12px;min-height:auto;" onclick="event.stopPropagation();addToCart(\'{name_js_safe}\', {p_price})">+ Commander</button>'
                    f'</div>'
                    f'</div>'
                )
                products_cards_html_list.append(card_markup)

            products_cards_html = "".join(products_cards_html_list)

            html_content = html_content.replace("{{store_name}}", name)
            html_content = html_content.replace("{{store_data_json}}", store_data_json)
            html_content = html_content.replace("{{hero_kicker}}", hero_kicker)
            html_content = html_content.replace("{{hero_title}}", hero_title)
            html_content = html_content.replace("{{hero_subtitle}}", hero_subtitle)
            html_content = html_content.replace("{{section_title}}", section_title)
            html_content = html_content.replace("{{categories_links_html}}", categories_links_html)
            html_content = html_content.replace("{{categories_chips_html}}", categories_chips_html)
            html_content = html_content.replace("{{categories_grid_html}}", categories_grid_html)
            html_content = html_content.replace("{{trust_badges_html}}", trust_badges_html)
            html_content = html_content.replace("{{products_cards_html}}", products_cards_html)
            html_content = html_content.replace("{{footer_about}}", footer_about)
            html_content = html_content.replace("{{primary_color}}", color)
            html_content = html_content.replace("{{font}}", _s(style_prefs.get("font"), "Inter"))
            html_content = html_content.replace("{{whatsapp_phone}}", phone)
            html_content = html_content.replace("{{seo_description}}", seo_description)
            html_content = html_content.replace("{{store_slogan}}", store_slogan)
            html_content = html_content.replace("{{about_text}}", desc)
            html_content = html_content.replace("{{products_json}}", products_json)
            html_content = html_content.replace("{{animation_style}}", anim)
            html_content = html_content.replace("{{bg_color}}", bg_color)
            html_content = html_content.replace("{{card_color}}", card_color)
            html_content = html_content.replace("{{text_color}}", text_color)
            html_content = html_content.replace("{{hero_gradient}}", hero_gradient)
            html_content = html_content.replace("{{footer_bg}}", card_color)
            html_content = html_content.replace("{{footer_text}}", text_color)
            html_content = html_content.replace(
                "{{og_image}}",
                products_json_items[0]["image"] if products_json_items else "",
            )
            html_content = html_content.replace("{{store_slug}}", slug)

            # ── Inline-analytics tracker tokens (template.html) ─────────────
            # These were historically never replaced and shipped as literal
            # "{{store_id}}" / "{{api_url}}" strings — the page kept working but
            # analytics were silently dead. Fill them from the same store row.
            html_content = html_content.replace("{{store_id}}", _s(store.get("id"), ""))
            html_content = html_content.replace(
                "{{api_url}}", _s(store.get("api_url"), "http://127.0.0.1:8000"),
            )

            # ── Secondary tokens the template uses but that were historically
            #    missed by this pipeline, leaving raw {{…}} visible on the
            #    live site (logo_html, hero_emoji, product_count, year…). ──
            hero_product = products_json_items[0] if products_json_items else None
            logo_initial = html_module.escape((name[:1] or "M").upper())
            html_content = html_content.replace(
                "{{logo_html}}",
                f'<span class="logo-badge" aria-hidden="true">{logo_initial}</span>',
            )
            html_content = html_content.replace("{{hero_emoji}}", "🛍️")
            html_content = html_content.replace(
                "{{hero_product_name}}",
                html_module.escape(hero_product["name"]) if hero_product else store_slogan,
            )
            html_content = html_content.replace(
                "{{hero_product_price}}",
                str(_price_int(hero_product["price"])) if hero_product else "",
            )
            html_content = html_content.replace(
                "{{product_count}}", str(len(products_json_items)),
            )
            html_content = html_content.replace("{{year}}", str(datetime.now().year))

            # Final safety net: never ship raw {{tokens}} to production.
            # Everything already replaced above stays untouched; any unknown
            # or obsolete token is simply dropped instead of leaking.
            html_content = re.sub(r"\{\{\s*[a-zA-Z0-9_]+\s*\}\}", "", html_content)

            return html_content

        except FileNotFoundError as e:
            logger.error(f"Store template not found at {template_path}: {e}")
            return (
                f"<!DOCTYPE html><html lang=\"fr\"><head><title>{name}</title></head>"
                f"<body><h1>{name}</h1><p>{desc}</p></body></html>"
            )
        except Exception as e:
            logger.error(f"Failed to load store template: {e}")
            return (
                f"<!DOCTYPE html><html lang=\"fr\"><head><title>{name}</title></head>"
                f"<body><h1>{name}</h1><p>{desc}</p></body></html>"
            )