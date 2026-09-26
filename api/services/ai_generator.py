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

    async def generate_store(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        store = store_data.get("store", {})
        products = store_data.get("products", [])
        style = store_data.get("style_preferences", {})
        seo = store_data.get("seo", {})
        slogan = store_data.get("slogan", "")
        store_id = store.get("id")

        theme_key = store.get("theme", "modern")
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

WHATSAPP :
- Numéro : {store.get('whatsapp_phone', '')}
- Le bouton Commander via WhatsApp doit générer un lien https://wa.me/NUMERO?text=MESSAGE
- Le MESSAGE doit contenir : nom de la boutique, liste des articles du panier (nom × quantité = sous-total), et le TOTAL en DZD.
- Encoder le message avec encodeURIComponent.

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
   - Chaque card : image, nom, prix (ancien prix barré si promo), badge "Promo" si original_price, bouton "Ajouter au panier"
   - Produits featured en premier avec badge "Vedette"
   - Hover effects sur les cards

4. **MODAL DÉTAIL PRODUIT**
   - S'ouvre au clic sur un produit
   - Image grande, nom, description longue, prix
   - Sélecteur de quantité (+/-)
   - Bouton "Ajouter au panier"
   - Fermeture par X, clic extérieur, ou Escape

5. **PANIER (SIDEBAR/DRAWER)**
   - S'ouvre depuis l'icône panier du header
   - Liste des articles avec quantité modifiable et suppression
   - Sous-total par article, Total général en DZD
   - Bouton "Commander via WhatsApp" (vert WhatsApp #25D366)
   - Bouton "Vider le panier"
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
            template_path = os.path.join(os.path.dirname(__file__), "..", "..", "store-template", "template.html")

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