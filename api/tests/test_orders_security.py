import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from pydantic import ValidationError

from routes.orders import (
    CreateOrderRequest,
    UpdateOrderStatusRequest,
    create_order,
    get_order,
    update_order_status,
)


def test_create_order_request_validation():
    # 1. Invalid name (< 2 chars or whitespace only)
    with pytest.raises(ValidationError):
        CreateOrderRequest(
            customer_name=" ",
            customer_phone="0550123456",
            total_amount=2500,
        )

    # 2. Invalid phone (< 9 digits)
    with pytest.raises(ValidationError):
        CreateOrderRequest(
            customer_name="Karim",
            customer_phone="055",
            total_amount=2500,
        )

    # 3. Valid order request
    req = CreateOrderRequest(
        customer_name="Karim Benali",
        customer_phone="0550 12 34 56",
        store_id="store-123",
        total_amount=3500.0,
    )
    assert req.customer_name == "Karim Benali"
    assert req.customer_phone == "0550 12 34 56"


@pytest.mark.anyio
async def test_create_order_rejects_missing_or_demo_store():
    mock_sb = MagicMock()

    # Sending store_id="demo" should be rejected with 400
    req_demo = CreateOrderRequest(
        store_id="demo",
        customer_name="Yacine",
        customer_phone="0661234567",
        total_amount=1000.0,
    )
    with pytest.raises(HTTPException) as exc:
        await create_order(req_demo, supabase=mock_sb)
    assert exc.value.status_code == 400

    # Sending store_id=None should be rejected with 400
    req_none = CreateOrderRequest(
        store_id=None,
        customer_name="Yacine",
        customer_phone="0661234567",
        total_amount=1000.0,
    )
    with pytest.raises(HTTPException) as exc:
        await create_order(req_none, supabase=mock_sb)
    assert exc.value.status_code == 400


@pytest.mark.anyio
async def test_get_order_ownership_blocking():
    mock_sb = MagicMock()

    # Simulate an order belonging to Owner A
    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.single.return_value = mock_query
    mock_query.execute.return_value = MagicMock(
        data={
            "id": "order-1",
            "store_id": "store-A",
            "customer_name": "Client A",
            "total_amount": 5000,
            "stores": {"owner_id": "user-A-owner"},
        }
    )
    mock_sb.table.return_value = mock_query

    # User B tries to view Order of User A -> MUST be blocked with 403
    with pytest.raises(HTTPException) as exc:
        await get_order(order_id="order-1", user_id="user-B-malicious", supabase=mock_sb)
    assert exc.value.status_code == 403
    assert "Accès refusé" in exc.value.detail

    # Legitimate Owner A views their order -> Allowed
    res = await get_order(order_id="order-1", user_id="user-A-owner", supabase=mock_sb)
    assert res["id"] == "order-1"
    assert res["customer_name"] == "Client A"


@pytest.mark.anyio
async def test_update_order_ownership_blocking():
    mock_sb = MagicMock()

    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.single.return_value = mock_query
    mock_query.execute.return_value = MagicMock(
        data={
            "id": "order-1",
            "store_id": "store-A",
            "status": "pending",
            "stores": {"owner_id": "user-A-owner"},
        }
    )
    mock_sb.table.return_value = mock_query

    payload = UpdateOrderStatusRequest(status="confirmed")

    # User B tries to confirm/alter Order of User A -> MUST be blocked with 403
    with pytest.raises(HTTPException) as exc:
        await update_order_status(
            order_id="order-1",
            payload=payload,
            user_id="user-B-malicious",
            supabase=mock_sb,
        )
    assert exc.value.status_code == 403
    assert "Accès refusé" in exc.value.detail
