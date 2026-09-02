from models.schemas import StoreCreate, StoreResponse, ProductCreate, TrackEventRequest
from routes.stores import slugify


def test_slugify_normalizes_text():
    assert slugify("  Ma Boutique 2026  ") == "ma-boutique-2026"


def test_slugify_removes_special_chars_and_extra_dashes():
    assert slugify("**Hello__World!!  -- Shop**") == "hello-world-shop"


def test_store_create_special_effects_not_shared():
    first = StoreCreate(name="AA", slug="aa", special_effects=["sparkle"])
    second = StoreCreate(name="BB", slug="bb")
    first.special_effects.append("glow")
    assert second.special_effects == []


def test_store_create_accepts_missing_slug_and_ignores_extra_fields():
    payload = StoreCreate.model_validate({
        "name": "Ma boutique",
        "owner_id": "",
        "status": "draft",
        "whatsapp_phone": "",
    })
    assert payload.slug is None
    assert payload.whatsapp_phone is None


def test_store_response_tolerates_null_json_fields():
    store = StoreResponse.model_validate({
        "id": "11111111-1111-1111-1111-111111111111",
        "owner_id": "22222222-2222-2222-2222-222222222222",
        "name": "Demo",
        "slug": "demo",
        "category": None,
        "description": None,
        "primary_color": "#6366f1",
        "font_family": None,
        "logo_url": None,
        "whatsapp_phone": None,
        "theme": "modern",
        "animation_style": "soft",
        "special_effects": None,
        "status": "draft",
        "subdomain": None,
        "published_url": None,
        "seo_metadata": None,
        "cover_url": "https://example.com/cover.png",
        "created_at": "2026-08-27T00:00:00Z",
        "updated_at": "2026-08-27T00:00:00Z",
    })
    assert store.special_effects == []
    assert store.seo_metadata == {}
    assert store.font_family == "modern"


def test_product_create_images_not_shared():
    first = ProductCreate(store_id="s1", name="P1", price=10.0)
    second = ProductCreate(store_id="s1", name="P2", price=11.0)
    first.images.append({"url": "u", "public_id": "p", "width": 1, "height": 1})
    assert second.images == []


def test_track_event_metadata_not_shared():
    first = TrackEventRequest(store_id="s1", event_type="view")
    second = TrackEventRequest(store_id="s2", event_type="cart_open")
    first.metadata["source"] = "ad"
    assert second.metadata == {}
