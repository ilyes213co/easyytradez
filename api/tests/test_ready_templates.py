import pytest
from services.ai_generator import AIStoreGenerator

ALL_THEMES = [
    "crimson",
    "energetic",
    "natural",
    "monochrome",
    "luxe-noir",
    "tuareg-indigo",
    "playful-pumpkin",
    "neo-brutalist",
    "phantom",
    "blossom-lavender",
]

@pytest.fixture
def generator():
    return AIStoreGenerator()

@pytest.mark.parametrize("theme", ALL_THEMES)
def test_render_funnel_templates(generator, theme):
    store_data = {
        "store": {
            "id": f"store-{theme}",
            "name": f"Test {theme.title()} Store",
            "slug": f"test-{theme}",
            "theme": theme,
            "type": "funnel",
            "whatsapp_phone": "0555000000",
            "description": "Une description test",
        },
        "products": [
            {
                "id": "prod-1",
                "name": f"Produit {theme.title()}",
                "price": 25000,
                "compare_price": 30000,
                "description": "Superbe produit fait main",
                "images": ["https://example.com/image.jpg"],
            }
        ],
    }
    html = generator._render_ready_template(store_data)
    assert html is not None, f"Template for funnel {theme} failed to render"
    assert f'data-theme="{theme}"' in html
    assert f"Test {theme.title()} Store" in html
    assert f"Produit {theme.title()}" in html
    assert "25 000 DA" in html

@pytest.mark.parametrize("theme", ALL_THEMES)
def test_render_boutique_templates(generator, theme):
    store_data = {
        "store": {
            "id": f"store-{theme}",
            "name": f"Boutique {theme.title()}",
            "slug": f"boutique-{theme}",
            "theme": theme,
            "type": "boutique",
            "whatsapp_phone": "0555000000",
            "description": "Boutique d'articles artisanaux",
        },
        "products": [
            {
                "id": "prod-1",
                "name": "Article Un",
                "price": 4500,
                "category": "Mode",
                "images": ["https://example.com/one.jpg"],
            },
            {
                "id": "prod-2",
                "name": "Article Deux",
                "price": 8900,
                "category": "Accessoires",
                "images": [],
            },
        ],
    }
    html = generator._render_ready_template(store_data)
    assert html is not None, f"Template for boutique {theme} failed to render"
    assert f'data-theme="{theme}"' in html
    assert f"Boutique {theme.title()}" in html
    assert "Article Un" in html
    assert "Article Deux" in html
    assert "4 500 DA" in html
    assert "8 900 DA" in html
