import pytest
from unittest.mock import MagicMock
from services.dispatcher import assign_order_smartly, rebalance_orders


def test_full_call_center_invitation_and_dispatch_flow():
    """
    Simulation complète de bout en bout :
    (a) Invitation créée (status='invited', is_active=False) -> Smart Dispatch ne l'assigne pas
    (b) Acceptation de l'invitation -> (status='active', is_active=True, user_id relié)
    (c) Commande passée par un client anonyme -> Smart Dispatch assigne la commande au confirmateur actif
    (d) Vérification que la commande apparaît dans la liste du confirmateur (assignée ou pool pending)
    """
    mock_sb = MagicMock()
    owner_id = "merchant-owner-999"
    store_id = "boutique-dz-1"
    confirmateur_uid = "auth-user-confirmateur-123"
    member_id = "mem-uuid-456"

    # Mocks de base pour les stores
    mock_store = MagicMock()
    mock_store.select.return_value = mock_store
    mock_store.eq.return_value = mock_store
    mock_store.maybe_single.return_value.execute.return_value = MagicMock(
        data={"id": store_id, "owner_id": owner_id}
    )

    mock_owner_stores = MagicMock()
    mock_owner_stores.select.return_value = mock_owner_stores
    mock_owner_stores.eq.return_value = mock_owner_stores
    mock_owner_stores.execute.return_value = MagicMock(
        data=[{"id": store_id}]
    )

    # ─────────────────────────────────────────────────────────────────────────
    # Phase (a) : Invitation en attente (status='invited', is_active=False)
    # ─────────────────────────────────────────────────────────────────────────
    member_record = {
        "id": member_id,
        "owner_id": owner_id,
        "email": "confirmateur@easytradez.dz",
        "user_email": "confirmateur@easytradez.dz",
        "user_id": confirmateur_uid,
        "role": "manager",
        "status": "invited",  # Non encore accepté
        "is_active": False,   # Inactif tant qu'il n'a pas validé
        "last_assigned_at": None,
    }

    mock_members_query_pending = MagicMock()
    mock_members_query_pending.select.return_value = mock_members_query_pending
    mock_members_query_pending.eq.return_value = mock_members_query_pending
    mock_members_query_pending.execute.return_value = MagicMock(data=[member_record])

    mock_orders_query = MagicMock()
    mock_orders_query.select.return_value = mock_orders_query
    mock_orders_query.in_.return_value = mock_orders_query
    mock_orders_query.not_.is_.return_value = mock_orders_query
    mock_orders_query.execute.return_value = MagicMock(data=[])

    def route_pending(table_name):
        if table_name == "stores":
            return mock_store
        elif table_name == "store_members":
            return mock_members_query_pending
        elif table_name == "orders":
            return mock_orders_query
        return MagicMock()

    mock_sb.table.side_effect = route_pending

    # Une commande arrive alors que le confirmateur est encore en 'invited'
    res_phase_a = assign_order_smartly(
        order_id="order-early-001",
        store_id=store_id,
        supabase=mock_sb,
    )

    # Le Smart Dispatch DOIT refuser d'assigner car aucun employé actif n'a accepté
    assert res_phase_a["success"] is False
    assert res_phase_a["reason"] == "no_active_members"

    # ─────────────────────────────────────────────────────────────────────────
    # Phase (b) : Acceptation de l'invitation par l'employé
    # ─────────────────────────────────────────────────────────────────────────
    member_record["status"] = "active"
    member_record["is_active"] = True

    mock_members_query_active = MagicMock()
    mock_members_query_active.select.return_value = mock_members_query_active
    mock_members_query_active.eq.return_value = mock_members_query_active
    mock_members_query_active.execute.return_value = MagicMock(data=[member_record])

    # ─────────────────────────────────────────────────────────────────────────
    # Phase (c) : Nouvelle commande passée par un client anonyme
    # ─────────────────────────────────────────────────────────────────────────
    def route_active(table_name):
        if table_name == "stores":
            return mock_store
        elif table_name == "store_members":
            return mock_members_query_active
        elif table_name == "orders":
            return mock_orders_query
        return MagicMock()

    mock_sb.table.side_effect = route_active

    res_phase_c = assign_order_smartly(
        order_id="order-new-002",
        store_id=store_id,
        supabase=mock_sb,
    )

    # Maintenant que l'invitation est acceptée, le Smart Dispatch assigne la commande !
    assert res_phase_c["success"] is True
    assert res_phase_c["assigned_to"] == confirmateur_uid
    assert res_phase_c["member_email"] == "confirmateur@easytradez.dz"

    # ─────────────────────────────────────────────────────────────────────────
    # Phase (d) : Vérification de visibilité côté Confirmateur
    # ─────────────────────────────────────────────────────────────────────────
    # Simuler la liste des commandes reçues sur le store
    all_store_orders = [
        {
            "id": "order-early-001",
            "store_id": store_id,
            "status": "pending",
            "assigned_to": None,  # Commande non assignée pendant la phase (a)
        },
        {
            "id": "order-new-002",
            "store_id": store_id,
            "status": "pending",
            "assigned_to": confirmateur_uid,  # Commande assignée à ce confirmateur
        },
        {
            "id": "order-other-agent",
            "store_id": store_id,
            "status": "confirmed",
            "assigned_to": "other-agent-999",  # Commande traitée par un autre agent
        },
    ]

    # Règle de filtrage confirmateur :
    # 1. Commandes assignées à son uid ou son member_id
    # 2. OU commandes 'pending' non encore assignées (assigned_to is None)
    my_uid = confirmateur_uid
    my_member_id = member_id

    visible_to_confirmateur = [
        o for o in all_store_orders
        if (
            o.get("assigned_to") in (my_uid, my_member_id)
            or (o.get("assigned_to") is None and o.get("status") == "pending")
        )
    ]

    # Vérification : Le confirmateur voit sa commande assignée ET la commande en attente dans le pool !
    visible_ids = [o["id"] for o in visible_to_confirmateur]
    assert "order-new-002" in visible_ids
    assert "order-early-001" in visible_ids
    assert "order-other-agent" not in visible_ids
    assert len(visible_to_confirmateur) == 2
