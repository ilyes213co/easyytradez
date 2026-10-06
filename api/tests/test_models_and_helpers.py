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
        "type": "funnel",
        "seo_metadata": {"title": "Mon Funnel"},
    })
    assert payload.slug is None
    assert payload.whatsapp_phone is None
    assert payload.type == "funnel"
    assert payload.seo_metadata == {"title": "Mon Funnel"}


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


def test_reorder_request_accepts_product_ids():
    from models.schemas import ReorderRequest
    req = ReorderRequest.model_validate({"product_ids": ["p1", "p2", "p3"]})
    assert req.product_ids == ["p1", "p2", "p3"]


def test_reorder_request_populates_from_legacy_items():
    from models.schemas import ReorderRequest
    req = ReorderRequest.model_validate({
        "items": [
            {"id": "p3", "position": 2},
            {"id": "p1", "position": 0},
            {"id": "p2", "position": 1},
        ]
    })
    assert req.product_ids == ["p1", "p2", "p3"]


def test_store_update_accepts_currency_slogan_and_location():
    from models.schemas import StoreUpdate
    update = StoreUpdate.model_validate({
        "name": "Boutique Prestige",
        "slogan": "Le chic algérien",
        "currency": "DZD",
        "city": "Oran",
        "country": "DZ",
    })
    data = update.model_dump(exclude_unset=True)
    assert data["name"] == "Boutique Prestige"
    assert data["slogan"] == "Le chic algérien"
    assert data["currency"] == "DZD"
    assert data["city"] == "Oran"
    assert data["country"] == "DZ"


def test_cors_origin_regex():
    import re
    from main import CORS_ORIGIN_REGEX
    assert re.match(CORS_ORIGIN_REGEX, "http://localhost:3000")
    assert re.match(CORS_ORIGIN_REGEX, "http://127.0.0.1:3000")
    assert re.match(CORS_ORIGIN_REGEX, "http://localhost:3001")
    assert re.match(CORS_ORIGIN_REGEX, "https://my-store.vercel.app")
    assert re.match(CORS_ORIGIN_REGEX, "https://storegen-platform-preview-123.vercel.app")
    assert not re.match(CORS_ORIGIN_REGEX, "https://malicious-site.com")
    assert not re.match(CORS_ORIGIN_REGEX, "https://notvercel.app.attacker.com")


def test_vercel_json_is_valid_json():
    import json
    from services.deployer import VERCEL_JSON
    parsed = json.loads(VERCEL_JSON)
    assert parsed.get("version") == 2
    assert "routes" in parsed


def test_deployer_dynamic_headers_and_guards(monkeypatch):
    import os
    from services.deployer import (
        StoreDeployer,
        VERCEL_HEADERS,
        GITHUB_HEADERS,
        get_vercel_headers,
        get_github_headers,
    )

    # Test dynamic update via monkeypatch
    monkeypatch.setenv("VERCEL_TOKEN", "test_v_tok_123")
    monkeypatch.setenv("GITHUB_TOKEN", "test_gh_tok_456")
    monkeypatch.setenv("GITHUB_OWNER", "test_merchant_owner")

    assert VERCEL_HEADERS["Authorization"] == "Bearer test_v_tok_123"
    assert GITHUB_HEADERS["Authorization"] == "token test_gh_tok_456"
    assert StoreDeployer._require_configured_owner() == "test_merchant_owner"

    # Verify _ensure_required_tokens succeeds
    StoreDeployer._ensure_required_tokens()

    # Verify failure when token missing
    monkeypatch.delenv("VERCEL_TOKEN", raising=False)
    import pytest
    with pytest.raises(RuntimeError, match="VERCEL_TOKEN"):
        StoreDeployer._ensure_required_tokens()


def test_store_models_support_phase1_fields():
    store = StoreCreate(
        name="TechDZ",
        custom_domain="techdz.com",
        facebook_pixel_id="fb_123456",
        tiktok_pixel_id="tt_987654",
        payment_settings={"cod_enabled": True, "baridimob_enabled": True},
    )
    assert store.custom_domain == "techdz.com"
    assert store.facebook_pixel_id == "fb_123456"
    assert store.tiktok_pixel_id == "tt_987654"
    assert store.payment_settings["baridimob_enabled"] is True

    resp = StoreResponse.model_validate({
        "id": "11111111-1111-1111-1111-111111111111",
        "owner_id": "22222222-2222-2222-2222-222222222222",
        "name": "TechDZ",
        "slug": "techdz",
        "custom_domain": "techdz.com",
        "facebook_pixel_id": "fb_123456",
        "tiktok_pixel_id": "tt_987654",
        "payment_settings": {"cod_enabled": True},
        "created_at": "2026-09-21T00:00:00Z",
        "updated_at": "2026-09-21T00:00:00Z",
    })
    assert resp.custom_domain == "techdz.com"
    assert resp.facebook_pixel_id == "fb_123456"
    assert resp.payment_settings.get("cod_enabled") is True


def test_product_models_support_sku_and_variants():
    prod = ProductCreate(
        store_id="s1",
        name="T-Shirt Premium",
        price=2500.0,
        sku="TSHIRT-001",
        variants=[
            {"id": "v1", "name": "Noir / L", "price": 2500, "stock": 10, "sku": "TSHIRT-BLK-L"},
            {"id": "v2", "name": "Blanc / M", "price": 2500, "stock": 5, "sku": "TSHIRT-WHT-M"},
        ],
    )
    assert prod.sku == "TSHIRT-001"
    assert len(prod.variants) == 2
    assert prod.variants[0]["sku"] == "TSHIRT-BLK-L"


def test_order_request_supports_payment_method():
    from routes.orders import CreateOrderRequest
    order_req = CreateOrderRequest(
        customer_name="Ahmed",
        customer_phone="0555123456",
        total_amount=5000.0,
        payment_method="baridimob",
    )
    assert order_req.payment_method == "baridimob"


def test_phase2_team_member_create():
    from models.schemas import TeamMemberCreate
    member = TeamMemberCreate(
        store_id="s123",
        user_email="manager@shop.dz",
        role="manager",
    )
    assert member.role == "manager"
    assert member.user_email == "manager@shop.dz"


def test_store_models_support_type():
    from models.schemas import StoreCreate, StoreUpdate, StoreResponse
    # Default is boutique
    sc = StoreCreate(name="Boutique Test")
    assert sc.type == "boutique"

    # Funnel type
    sf = StoreCreate(name="Funnel Test", type="funnel")
    assert sf.type == "funnel"

    # StoreUpdate
    su = StoreUpdate(type="funnel")
    assert su.type == "funnel"

    # StoreResponse default fallback
    sr = StoreResponse.model_validate({
        "id": "11111111-1111-1111-1111-111111111111",
        "owner_id": "22222222-2222-2222-2222-222222222222",
        "name": "Demo",
        "slug": "demo",
        "created_at": "2026-08-27T00:00:00Z",
        "updated_at": "2026-08-27T00:00:00Z",
    })
    assert sr.type == "boutique"

    sr_funnel = StoreResponse.model_validate({
        "id": "11111111-1111-1111-1111-111111111111",
        "owner_id": "22222222-2222-2222-2222-222222222222",
        "name": "Funnel Demo",
        "slug": "funnel-demo",
        "type": "funnel",
        "created_at": "2026-08-27T00:00:00Z",
        "updated_at": "2026-08-27T00:00:00Z",
    })
    assert sr_funnel.type == "funnel"





