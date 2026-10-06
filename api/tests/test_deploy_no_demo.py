import pytest
from services.ai_generator import AIStoreGenerator

DEMO_FORBIDDEN_NAMES = [
    "Veste en cuir Bab El Oued",
    "Écouteurs Pulse Air",
    "Huile d'olive extra vierge",
    "Montre Kairos 38",
    "Nuit d'Oran",
    "Collier touareg",
    "Sac à dos Yalla",
    "Sneakers Bloc 01",
    "Casque Phantom X7",
    "Coffret Rose d'Atlas",
    "Produit Vedette",
]

DEMO_FORBIDDEN_PRICES = [
    "42 000 DA",
    "42\xa0000\xa0DA",
    "38 000 DA",
    "38\xa0000\xa0DA",
]

@pytest.fixture
def generator():
    return AIStoreGenerator()

def test_funnel_custom_product_has_no_demo_leak(generator):
    """Vérifie qu'un funnel Crimson avec produit custom ne contient AUCUN résidu de démo."""
    store_data = {
        "store": {
            "id": "store-custom-glasses",
            "name": "Optique Moderne",
            "slug": "optique-moderne",
            "theme": "crimson",
            "type": "funnel",
            "whatsapp_phone": "0550123456",
            "description": "Boutique de lunettes solaires haute protection.",
        },
        "products": [
            {
                "id": "prod-sunglasses",
                "name": "Lunettes de Soleil Polarisées UV400",
                "price": 3500,
                "compare_price": 5000,
                "description": "Verres anti-reflets catégorie 3, monture ultra légère en polycarbonate.",
                "images": ["https://cdn.example.com/glasses.jpg"],
                "benefits": [
                    "Protection UV400 certifiée",
                    "Livraison 58 wilayas en 48h",
                    "Paiement à la livraison",
                ],
            }
        ],
    }

    html = generator._render_ready_template(store_data)
    assert html is not None, "Le template Crimson doit être généré"

    # Vérifications positives : les données de l'utilisateur sont bien présentes
    assert "Optique Moderne" in html
    assert "Lunettes de Soleil Polarisées UV400" in html
    assert "3 500 DA" in html or "3\xa0500\xa0DA" in html
    assert "https://cdn.example.com/glasses.jpg" in html
    assert "Protection UV400 certifiée" in html

    # Vérifications négatives STRICTES : aucune donnée de démo Crimson
    for demo_name in DEMO_FORBIDDEN_NAMES:
        assert demo_name not in html, f"Fuite de donnée démo détectée : '{demo_name}'"

    for demo_price in DEMO_FORBIDDEN_PRICES:
        assert demo_price not in html, f"Fuite de prix démo détectée : '{demo_price}'"

    assert "Cuir de vachette" not in html, "Fuite de description démo vestes"
    assert "Rouge sang" not in html, "Fuite d'options/swatches vestes démo"


def test_funnel_without_products_returns_none(generator):
    """Un funnel sans produits ne doit JAMAIS générer de 'Produit Vedette' factice."""
    store_data = {
        "store": {
            "id": "store-empty",
            "name": "Store Vide",
            "slug": "store-vide",
            "theme": "crimson",
            "type": "funnel",
            "whatsapp_phone": "0550123456",
            "description": "Pas de produits",
        },
        "products": [],
    }

    html = generator._render_ready_template(store_data)
    assert html is None, "Sans produits, le template funnel ne doit pas injecter de faux produit vedette"


def test_boutique_custom_products_eradicates_demo_cards(generator):
    """Une boutique avec produits réels ne doit comporter aucune carte de démo."""
    store_data = {
        "store": {
            "id": "store-tech",
            "name": "Algeria Tech Store",
            "slug": "algeria-tech-store",
            "theme": "monochrome",
            "type": "boutique",
            "whatsapp_phone": "0550987654",
            "description": "High tech & accessoires en Algérie.",
        },
        "products": [
            {
                "id": "p1",
                "name": "Clavier Mécanique Sans Fil",
                "price": 7200,
                "category": "Informatique",
                "images": ["https://cdn.example.com/keyboard.jpg"],
            },
            {
                "id": "p2",
                "name": "Souris Gaming 16000 DPI",
                "price": 3800,
                "category": "Gaming",
                "images": [],
            },
        ],
    }

    html = generator._render_ready_template(store_data)
    assert html is not None
    assert "Algeria Tech Store" in html
    assert "Clavier Mécanique Sans Fil" in html
    assert "Souris Gaming 16000 DPI" in html
    assert "7 200 DA" in html or "7\xa0200\xa0DA" in html
    assert "3 800 DA" in html or "3\xa0800\xa0DA" in html

    for demo_name in DEMO_FORBIDDEN_NAMES:
        assert demo_name not in html, f"Fuite de produit démo dans la boutique : '{demo_name}'"


def test_product_create_schema_resilience():
    """Vérifie que ProductCreate accepte les listes de chaînes d'URL et les dicts sans public_id sans lever d'erreur 422."""
    from routes.products import ProductCreate

    # Cas 1 : images sous forme de chaînes d'URL (provenant du frontend ou de scripts)
    p1 = ProductCreate(
        store_id="store-123",
        name="Produit URLs simples",
        price=2500,
        images=["https://cdn.example.com/item1.jpg", "https://cdn.example.com/item2.webp"]
    )
    assert len(p1.images) == 2
    assert p1.images[0].url == "https://cdn.example.com/item1.jpg"
    assert p1.images[0].public_id == "item1.jpg"

    # Cas 2 : images sous forme de dict sans public_id
    p2 = ProductCreate(
        store_id="store-123",
        name="Produit Dict partiel",
        price=4500,
        images=[{"url": "https://cdn.example.com/partial.png"}]
    )
    assert len(p2.images) == 1
    assert p2.images[0].url == "https://cdn.example.com/partial.png"
    assert p2.images[0].public_id == "partial.png"

    # Cas 3 : images complètes
    p3 = ProductCreate(
        store_id="store-123",
        name="Produit ImageItem complet",
        price=6000,
        images=[{"url": "https://cdn.example.com/full.jpg", "public_id": "full_pid", "width": 800, "height": 800}]
    )
    assert len(p3.images) == 1
    assert p3.images[0].public_id == "full_pid"

