"""
AIStoreGenerator — Moteur de génération IA de boutiques e-commerce.

Utilise l'API Anthropic (Claude) pour générer :
• Un fichier HTML complet autonome (CSS + JS inline)
• Des métadonnées SEO optimisées
• Des descriptions de produits améliorées
• Un slogan accrocheur

Fonctionnalités :
- Retry automatique (3 tentatives, backoff exponentiel)
- Fallback sur template statique si l'API échoue
- Logging dans Supabase (tokens, durée, succès/échec)
"""

import os
import json
import asyncio
import logging
import time
import html as html_module
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

from anthropic import AsyncAnthropic
from tenacity import (
    AsyncRetrying,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = logging.getLogger("storegen.ai")

# ─────────────────────────────────────────────────────────────────────────────
# Theme design tokens — fed into the system prompt for coherent styling
# ─────────────────────────────────────────────────────────────────────────────

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
    Générateur de boutiques e-commerce via l'API Claude (Anthropic).

    Usage:
        generator = AIStoreGenerator()
        result = await generator.generate_store(store_data)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        supabase_client: Optional[Any] = None,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            logger.warning("ANTHROPIC_API_KEY manquant — les fonctionnalités IA échoueront.")
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None
        self.model = "claude-sonnet-4-20250514"
        self.supabase = supabase_client

    # ─────────────────────────────────────────────────────────────────────────
    # Private: Claude API call with retry + logging
    # ─────────────────────────────────────────────────────────────────────────

    async def _call_claude(
        self,
        prompt: str,
        system_prompt: str,
        max_tokens: int = 4096,
        *,
        method_name: str = "unknown",
        store_id: Optional[str] = None,
    ) -> Tuple[str, dict]:
        """
        Appelle l'API Claude avec retry automatique (AsyncRetrying — event-loop safe).
        Retourne (texte, metadata_usage).
        """
        if not self.client:
            raise RuntimeError("Client Anthropic non initialisé (API key manquante)")

        last_error: Optional[Exception] = None

        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        ):
            with attempt:
                start = time.time()
                try:
                    message = await self.client.messages.create(
                        model=self.model,
                        max_tokens=max_tokens,
                        system=system_prompt,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    duration = time.time() - start
                    usage = {
                        "input_tokens": message.usage.input_tokens,
                        "output_tokens": message.usage.output_tokens,
                        "duration_seconds": round(duration, 2),
                    }
                    text = message.content[0].text
                    logger.info(
                        f"✅ Claude [{method_name}] — {duration:.2f}s, "
                        f"in={usage['input_tokens']} out={usage['output_tokens']} tokens"
                    )
                    # Log to Supabase (fire-and-forget)
                    asyncio.create_task(
                        self._log_to_supabase(
                            method=method_name,
                            store_id=store_id,
                            success=True,
                            tokens_in=usage["input_tokens"],
                            tokens_out=usage["output_tokens"],
                            duration=duration,
                        )
                    )
                    return text, usage

                except Exception as e:
                    last_error = e
                    duration = time.time() - start
                    logger.warning(
                        f"⚠️ Claude [{method_name}] tentative échouée après {duration:.2f}s: {e}"
                    )
                    raise  # laisse AsyncRetrying décider de retenter

        # Ce point n'est atteint qu'après épuisement des tentatives (reraise=True)
        duration = time.time() - start if 'start' in dir() else 0.0
        asyncio.create_task(
            self._log_to_supabase(
                method=method_name,
                store_id=store_id,
                success=False,
                duration=duration,
                error=str(last_error),
            )
        )
        raise last_error  # type: ignore[misc]

    # ─────────────────────────────────────────────────────────────────────────
    # Private: Supabase logging (fire-and-forget)
    # ─────────────────────────────────────────────────────────────────────────

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
        """Log la requête IA dans la table ai_generation_logs de Supabase."""
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

    # ─────────────────────────────────────────────────────────────────────────
    # Private: Strip markdown code fences from Claude output
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _strip_code_fences(text: str) -> str:
        """Supprime les balises ```html ... ``` si Claude enveloppe sa réponse."""
        stripped = text.strip()
        # Handle ```html ... ``` or ``` ... ```
        if stripped.startswith("```"):
            # Remove opening fence (with optional language tag)
            first_newline = stripped.index("\n") if "\n" in stripped else len(stripped)
            stripped = stripped[first_newline + 1:]
        if stripped.endswith("```"):
            stripped = stripped[:-3]
        return stripped.strip()

    # ═════════════════════════════════════════════════════════════════════════
    # PUBLIC: generate_store — Génération HTML complète
    # ═════════════════════════════════════════════════════════════════════════

    async def generate_store(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère un fichier HTML complet et autonome pour une boutique e-commerce.

        Args:
            store_data: {
                store: {name, description, category, primary_color, theme,
                        animation_style, logo_url, whatsapp_phone},
                products: [{name, description, price, original_price, images,
                            category, is_featured}],
                style_preferences: {font, effects: ['parallax', 'particles', 'counter']},
                seo: {title, description, ...}  (optionnel, enrichi en amont),
                slogan: str (optionnel)
            }

        Returns:
            {success: bool, html: str, generated_at: str, usage: dict}
        """
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

        # Build effects instructions
        requested_effects = style.get("effects", [])
        effects_block = "\n".join(
            f"- {EFFECTS_INSTRUCTIONS[e]}" for e in requested_effects if e in EFFECTS_INSTRUCTIONS
        )

        # Serialize products for prompt (compact, relevant fields only)
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

        # ─── System prompt ────────────────────────────────────────────────
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

        # ─── User prompt ──────────────────────────────────────────────────
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
            raw_html, usage = await self._call_claude(
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

    # ═════════════════════════════════════════════════════════════════════════
    # PUBLIC: generate_seo — Métadonnées SEO
    # ═════════════════════════════════════════════════════════════════════════

    async def generate_seo(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère des métadonnées SEO optimisées.

        Returns:
            {title, description, og_title, og_description, keywords}
        """
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
            text, _ = await self._call_claude(
                prompt, system, max_tokens=500,
                method_name="generate_seo", store_id=store_id,
            )
            # Extract JSON from response (handle potential wrapping)
            clean = text.strip()
            if clean.startswith("```"):
                clean = self._strip_code_fences(clean)
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("SEO JSON invalide, extraction par heuristique")
            try:
                # Try to find JSON in the response
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

    # ═════════════════════════════════════════════════════════════════════════
    # PUBLIC: generate_product_descriptions — Descriptions améliorées
    # ═════════════════════════════════════════════════════════════════════════

    async def generate_product_descriptions(
        self, products: List[Dict], store_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Améliore les descriptions de produits en parallèle.
        Les échecs individuels retournent le produit inchangé.
        """
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
                new_desc, _ = await self._call_claude(
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

        # If gather returned exceptions, use original products
        return [
            r if isinstance(r, dict) else products[i]
            for i, r in enumerate(results)
        ]

    # ═════════════════════════════════════════════════════════════════════════
    # PUBLIC: generate_slogan — Slogan accrocheur
    # ═════════════════════════════════════════════════════════════════════════

    async def generate_slogan(self, store_data: Dict[str, Any]) -> str:
        """Génère un slogan accrocheur (max 10 mots)."""
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
            text, _ = await self._call_claude(
                prompt, system, max_tokens=100,
                method_name="generate_slogan",
                store_id=store.get("id"),
            )
            # Clean: remove quotes if present
            clean = text.strip().strip('"').strip("'").strip("«").strip("»")
            return clean
        except Exception:
            return "Qualité & élégance à portée de clic"

    # ═════════════════════════════════════════════════════════════════════════
    # FALLBACK: Template HTML statique fonctionnel
    # ═════════════════════════════════════════════════════════════════════════

    def _get_fallback_template(
        self, store: Dict[str, Any], products: List[Dict], style: Dict[str, Any] = None, seo: Dict[str, Any] = None, slogan: str = ""
    ) -> str:
        """
        Template HTML statique complet avec panier fonctionnel et WhatsApp.
        Utilisé en fallback quand l'API Claude est indisponible.
        """
        name = html_module.escape(store.get("name", "Ma Boutique"))
        desc = html_module.escape(store.get("description", "Bienvenue"))
        color = store.get("primary_color", "#534AB7")
        phone = store.get("whatsapp_phone", "")
        slug = store.get("slug", "boutique")
        year = datetime.now().year
        
        style_prefs = style or {}
        seo_data = seo or {}
        
        # Determine theme tokens
        theme_key = store.get("theme", "modern")
        theme_tokens = THEME_DESIGN_TOKENS.get(theme_key, THEME_DESIGN_TOKENS["modern"])
        bg_color = theme_tokens["bg"]
        card_color = theme_tokens["card_bg"]
        text_color = theme_tokens["text"]
        
        # Optional hero logic
        hero_gradient = f"linear-gradient(135deg, {color}, #1e293b)"

        products_json_items = []
        for i, p in enumerate(products):
            p_price = p.get("price", 0)
            images = p.get("images", [])
            p_img = ""
            if images:
                p_img = images[0].get("url", images[0]) if isinstance(images[0], dict) else images[0]

            products_json_items.append({
                "id": str(p.get("id", i)),
                "name": p.get("name", f"Produit {i+1}"),
                "price": p_price,
                "image": p_img,
                "description": p.get("description", ""),
                "original_price": p.get("original_price"),
                "category": p.get("category", ""),
                "is_featured": p.get("is_featured", False),
            })

        products_json = json.dumps(products_json_items, ensure_ascii=False)

        # Build dynamic HTML from the generated template file
        template_path = os.path.join(os.path.dirname(__file__), "..", "..", "store-template", "template.html")
        
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                html_content = f.read()
                
            # Perform substitutions
            html_content = html_content.replace("{{store_name}}", name)
            html_content = html_content.replace("{{primary_color}}", color)
            html_content = html_content.replace("{{font}}", style_prefs.get('font', 'Inter'))
            html_content = html_content.replace("{{whatsapp_phone}}", phone)
            html_content = html_content.replace("{{seo_description}}", html_module.escape(seo_data.get('description', desc)))
            html_content = html_content.replace("{{store_slogan}}", html_module.escape(slogan or desc))
            html_content = html_content.replace("{{about_text}}", desc)
            html_content = html_content.replace("{{products_json}}", products_json)
            html_content = html_content.replace("{{animation_style}}", store.get("animation_style", "soft"))
            html_content = html_content.replace("{{bg_color}}", bg_color)
            html_content = html_content.replace("{{card_color}}", card_color)
            html_content = html_content.replace("{{text_color}}", text_color)
            html_content = html_content.replace("{{hero_gradient}}", hero_gradient)
            html_content = html_content.replace("{{footer_bg}}", card_color)
            html_content = html_content.replace("{{footer_text}}", text_color)
            html_content = html_content.replace("{{og_image}}", products_json_items[0]["image"] if products_json_items else "")
            html_content = html_content.replace("{{store_slug}}", slug)
            
            return html_content
            
        except Exception as e:
            logger.error(f"Failed to load store template: {e}")
            # Ultra basic fallback if the file is missing
            return f"""<!DOCTYPE html><html lang="fr"><head><title>{name}</title></head><body><h1>{name}</h1><p>{desc}</p></body></html>"""
