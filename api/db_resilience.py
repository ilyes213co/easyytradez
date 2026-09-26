"""
db_resilience.py — Tolérance aux pannes pour les colonnes et tables manquantes dans Supabase.
Permet à l'application de fonctionner parfaitement même si des migrations SQL n'ont pas encore été exécutées.
"""

from __future__ import annotations

import logging
import re
from collections import defaultdict
from threading import Lock
from typing import Any

logger = logging.getLogger("storegen.db_resilience")

# Cache mémoire des colonnes non prises en charge par table
_unsupported_columns: dict[str, set[str]] = defaultdict(set)
_lock = Lock()


def get_unsupported_columns(table_name: str) -> set[str]:
    with _lock:
        return set(_unsupported_columns[table_name])


def record_unsupported_column(table_name: str, column_name: str) -> None:
    with _lock:
        _unsupported_columns[table_name].add(column_name)


def safe_insert(table_name: str, data: dict[str, Any], supabase_client: Any) -> Any:
    """
    Insère des données dans une table Supabase.
    Si Supabase signale une colonne inexistante (erreur PGRST204),
    la colonne est retirée et l'insertion est re-tentée automatiquement.
    """
    payload = data.copy()
    with _lock:
        for col in _unsupported_columns[table_name]:
            payload.pop(col, None)

    max_attempts = 15
    for attempt in range(max_attempts):
        try:
            return supabase_client.table(table_name).insert(payload).execute()
        except Exception as exc:
            msg = str(exc)
            m = re.search(r"Could not find the '([^']+)' column", msg)
            if m:
                missing_col = m.group(1)
                record_unsupported_column(table_name, missing_col)
                if missing_col in payload:
                    logger.warning(
                        "Colonne '%s' introuvable dans la table '%s'. Réessai sans cette colonne.",
                        missing_col,
                        table_name,
                    )
                    payload.pop(missing_col, None)
                    continue
            raise exc
    raise RuntimeError(f"Échec d'insertion dans {table_name} après {max_attempts} tentatives.")


def safe_update(
    table_name: str,
    data: dict[str, Any],
    match_col: str,
    match_val: Any,
    supabase_client: Any,
) -> Any:
    """
    Met à jour des données dans une table Supabase.
    Si Supabase signale une colonne inexistante (erreur PGRST204),
    la colonne est retirée et la mise à jour est re-tentée automatiquement.
    """
    payload = data.copy()
    with _lock:
        for col in _unsupported_columns[table_name]:
            payload.pop(col, None)

    if not payload:
        # Aucune colonne restante à mettre à jour
        return None

    max_attempts = 15
    for attempt in range(max_attempts):
        try:
            return (
                supabase_client.table(table_name)
                .update(payload)
                .eq(match_col, match_val)
                .execute()
            )
        except Exception as exc:
            msg = str(exc)
            m = re.search(r"Could not find the '([^']+)' column", msg)
            if m:
                missing_col = m.group(1)
                record_unsupported_column(table_name, missing_col)
                if missing_col in payload:
                    logger.warning(
                        "Colonne '%s' introuvable dans la table '%s'. Réessai sans cette colonne.",
                        missing_col,
                        table_name,
                    )
                    payload.pop(missing_col, None)
                    if not payload:
                        return None
                    continue
            raise exc
    raise RuntimeError(f"Échec de mise à jour dans {table_name} après {max_attempts} tentatives.")
