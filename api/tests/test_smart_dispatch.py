import pytest
from unittest.mock import MagicMock
from services.dispatcher import assign_order_smartly, rebalance_orders


def test_assign_order_smartly_least_loaded():
    mock_sb = MagicMock()

    # 1. Store mock: owned by "owner-123"
    mock_store_query = MagicMock()
    mock_store_query.select.return_value = mock_store_query
    mock_store_query.eq.return_value = mock_store_query
    mock_store_query.maybe_single.return_value.execute.return_value = MagicMock(
        data={"id": "store-1", "owner_id": "owner-123"}
    )

    # 2. Store members mock: two active operators
    mock_members_query = MagicMock()
    mock_members_query.select.return_value = mock_members_query
    mock_members_query.eq.return_value = mock_members_query
    mock_members_query.execute.return_value = MagicMock(
        data=[
            {
                "id": "mem-1",
                "user_id": "user-op-1",
                "user_email": "op1@easytradez.dz",
                "owner_id": "owner-123",
                "is_active": True,
                "status": "active",
                "last_assigned_at": "2026-10-17T01:00:00Z",
            },
            {
                "id": "mem-2",
                "user_id": "user-op-2",
                "user_email": "op2@easytradez.dz",
                "owner_id": "owner-123",
                "is_active": True,
                "status": "active",
                "last_assigned_at": "2026-10-17T00:30:00Z",
            },
        ]
    )

    # 3. Owner stores mock: store-1 and funnel-1
    mock_owner_stores = MagicMock()
    mock_owner_stores.select.return_value = mock_owner_stores
    mock_owner_stores.eq.return_value = mock_owner_stores
    mock_owner_stores.execute.return_value = MagicMock(
        data=[{"id": "store-1"}, {"id": "funnel-1"}]
    )

    # 4. Orders mock: op-1 currently has 2 active orders, op-2 has 1 active order
    mock_active_orders = MagicMock()
    mock_active_orders.select.return_value = mock_active_orders
    mock_active_orders.in_.return_value = mock_active_orders
    mock_active_orders.not_.is_.return_value = mock_active_orders
    mock_active_orders.execute.return_value = MagicMock(
        data=[
            {"id": "ord-a", "assigned_to": "user-op-1"},
            {"id": "ord-b", "assigned_to": "user-op-1"},
            {"id": "ord-c", "assigned_to": "user-op-2"},
        ]
    )

    # 5. Orders update & Members update mocks
    mock_update_query = MagicMock()
    mock_update_query.update.return_value = mock_update_query
    mock_update_query.eq.return_value = mock_update_query
    mock_update_query.execute.return_value = MagicMock(data=[{"id": "order-new"}])

    def table_router(table_name):
        if table_name == "stores":
            # Can be single store check or owner stores
            return mock_store_query
        elif table_name == "store_members":
            return mock_members_query
        elif table_name == "orders":
            return mock_active_orders
        return MagicMock()

    # Route table calls specifically
    mock_sb.table.side_effect = table_router

    # Op 2 has 1 active order vs Op 1 who has 2 active orders
    # Smart Dispatch MUST pick Op 2 (Least-Loaded)!
    res = assign_order_smartly(
        order_id="order-new",
        store_id="funnel-1",
        supabase=mock_sb,
    )

    assert res["success"] is True
    assert res["assigned_to"] == "user-op-2"
    assert res["member_email"] == "op2@easytradez.dz"


def test_rebalance_orders_equal_distribution():
    mock_sb = MagicMock()

    # 1. Owner stores
    mock_stores_query = MagicMock()
    mock_stores_query.select.return_value = mock_stores_query
    mock_stores_query.eq.return_value = mock_stores_query
    mock_stores_query.execute.return_value = MagicMock(
        data=[{"id": "store-1"}, {"id": "funnel-1"}]
    )

    # 2. Members: 2 active
    mock_members_query = MagicMock()
    mock_members_query.select.return_value = mock_members_query
    mock_members_query.eq.return_value = mock_members_query
    mock_members_query.execute.return_value = MagicMock(
        data=[
            {"id": "m1", "user_id": "u1", "is_active": True, "status": "active", "last_assigned_at": None},
            {"id": "m2", "user_id": "u2", "is_active": True, "status": "active", "last_assigned_at": None},
        ]
    )

    # 3. Pending orders: 4 orders
    mock_pending_orders = MagicMock()
    mock_pending_orders.select.return_value = mock_pending_orders
    mock_pending_orders.in_.return_value = mock_pending_orders
    mock_pending_orders.eq.return_value = mock_pending_orders
    mock_pending_orders.order.return_value = mock_pending_orders
    mock_pending_orders.execute.return_value = MagicMock(
        data=[
            {"id": "ord-1", "assigned_to": None},
            {"id": "ord-2", "assigned_to": None},
            {"id": "ord-3", "assigned_to": None},
            {"id": "ord-4", "assigned_to": None},
        ]
    )

    def table_router(table_name):
        if table_name == "stores":
            return mock_stores_query
        elif table_name == "store_members":
            return mock_members_query
        elif table_name == "orders":
            return mock_pending_orders
        return MagicMock()

    mock_sb.table.side_effect = table_router

    res = rebalance_orders(owner_id="owner-123", supabase=mock_sb)
    assert res["success"] is True
    assert res["total_pending"] == 4
    assert res["rebalanced"] == 4
    # Both u1 and u2 should have exactly 2 orders assigned
    assert res["final_workloads"]["u1"] == 2
    assert res["final_workloads"]["u2"] == 2
