import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock
from plan_guard import (
    get_effective_plan,
    get_user_plan,
    check_store_creation_allowed,
    check_theme_allowed,
    check_product_creation_allowed,
    check_ai_generation_allowed,
    check_bulk_shipping_allowed,
    check_team_management_allowed,
    PlanLimitException,
    FREE_THEMES,
    ALL_THEMES,
)


def test_plan_expiration():
    # Plan non expiré
    future_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    plan_pro = get_effective_plan("pro", future_date)
    assert plan_pro.plan == "pro"
    assert plan_pro.stores_limit == 5

    # Plan expiré -> rétrogradation automatique en free
    past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    plan_expired = get_effective_plan("pro", past_date)
    assert plan_expired.plan == "free"
    assert plan_expired.stores_limit == 1

    # Date avec 'Z'
    past_date_z = (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    plan_expired_z = get_effective_plan("business", past_date_z)
    assert plan_expired_z.plan == "free"
    assert plan_expired_z.stores_limit == 1


def test_theme_restrictions():
    mock_supabase = MagicMock()
    # Mock profile returns free plan
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }

    # Free themes should pass
    for t in FREE_THEMES:
        plan = check_theme_allowed("user-123", t, mock_supabase)
        assert plan.plan == "free"

    # Premium theme should raise PlanLimitException
    with pytest.raises(PlanLimitException) as exc_info:
        check_theme_allowed("user-123", "luxe-noir", mock_supabase)
    
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["code"] == "PLAN_LIMIT_REACHED"
    assert "luxe-noir" in exc_info.value.detail["message"]
    assert exc_info.value.detail["limit_type"] == "theme"

    # With Pro plan, premium theme should pass
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    plan = check_theme_allowed("user-123", "luxe-noir", mock_supabase)
    assert plan.plan == "pro"


def test_store_creation_limits():
    mock_supabase = MagicMock()
    # Free plan with 1 existing store
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }
    mock_supabase.table().select().eq().execute.return_value.count = 1

    # Reaching limit 1
    with pytest.raises(PlanLimitException) as exc_info:
        check_store_creation_allowed("user-123", "monochrome", mock_supabase)
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["limit_type"] == "stores"
    assert exc_info.value.detail["current"] == 1
    assert exc_info.value.detail["limit"] == 1

    # Pro plan with 1 store should pass
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    plan = check_store_creation_allowed("user-123", "monochrome", mock_supabase)
    assert plan.plan == "pro"


def test_product_creation_limits():
    mock_supabase = MagicMock()
    # Free plan
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }
    # 10 existing products
    mock_supabase.table().select().eq().execute.return_value.count = 10

    with pytest.raises(PlanLimitException) as exc_info:
        check_product_creation_allowed("user-123", "store-abc", mock_supabase)
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["limit_type"] == "products"
    assert exc_info.value.detail["current"] == 10
    assert exc_info.value.detail["limit"] == 10


def test_ai_generation_limits():
    mock_supabase = MagicMock()
    # Free plan with 1 already completed job
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }
    # Count of completed jobs
    mock_supabase.table().select().eq().in_().execute.return_value.count = 1

    with pytest.raises(PlanLimitException) as exc_info:
        check_ai_generation_allowed("user-123", "store-abc", mock_supabase)
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["limit_type"] == "ai"

    # Pro plan should be unlimited
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    plan = check_ai_generation_allowed("user-123", "store-abc", mock_supabase)
    assert plan.plan == "pro"


def test_bulk_shipping_limits():
    mock_supabase = MagicMock()
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }

    with pytest.raises(PlanLimitException) as exc_info:
        check_bulk_shipping_allowed("user-123", mock_supabase)
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["limit_type"] == "shipping_bulk"

    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    plan = check_bulk_shipping_allowed("user-123", mock_supabase)
    assert plan.plan == "pro"


def test_team_management_limits():
    mock_supabase = MagicMock()
    # Free plan should be rejected
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }
    with pytest.raises(PlanLimitException) as exc_info:
        check_team_management_allowed("user-123", mock_supabase)
    assert exc_info.value.detail["detail"] == "PLAN_LIMIT_REACHED"
    assert exc_info.value.detail["limit_type"] == "team"

    # Pro plan should also be rejected (only Business allowed)
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    with pytest.raises(PlanLimitException) as exc_info:
        check_team_management_allowed("user-123", mock_supabase)
    assert exc_info.value.detail["limit_type"] == "team"

    # Business plan should be allowed
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "business",
        "plan_expires_at": None,
    }
    plan = check_team_management_allowed("user-123", mock_supabase)
    assert plan.plan == "business"
    assert plan.can_use_team is True


def test_custom_domain_and_pixel_plan_limits():
    mock_supabase = MagicMock()
    # Free plan: no custom domain
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "free",
        "plan_expires_at": None,
    }
    free_plan = get_user_plan("user-123", mock_supabase)
    assert free_plan.can_use_custom_domain is False
    assert free_plan.plan == "free"

    # Pro plan: custom domain allowed
    mock_supabase.table().select().eq().single().execute.return_value.data = {
        "plan": "pro",
        "plan_expires_at": None,
    }
    pro_plan = get_user_plan("user-123", mock_supabase)
    assert pro_plan.can_use_custom_domain is True
    assert pro_plan.plan == "pro"


