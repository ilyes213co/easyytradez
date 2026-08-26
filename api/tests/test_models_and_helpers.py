from models.schemas import StoreCreate, ProductCreate, TrackEventRequest
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
