import os
import json
import hashlib
import logging
from typing import Optional, List, Dict, Any

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.id import ID
from appwrite.query import Query
from appwrite.exception import AppwriteException

logger = logging.getLogger("nucleus.database")

# Appwrite configuration
APPWRITE_ENDPOINT = os.environ.get("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
APPWRITE_PROJECT_ID = os.environ.get("APPWRITE_PROJECT_ID")
APPWRITE_API_KEY = os.environ.get("APPWRITE_API_KEY")
APPWRITE_DATABASE_ID = os.environ.get("APPWRITE_DATABASE_ID", "nucleus")

# Table IDs -- must match what scripts/setup_appwrite.py provisions
TABLE_CACHE = "compression_cache"
TABLE_METRICS = "metrics_history"
TABLE_SESSIONS = "conversation_sessions"
TABLE_TRACES = "run_traces"

# Appwrite row IDs must be <=36 chars from a restricted charset. Backend keys
# (cache keys, session IDs) are arbitrary-length/charset, so they're hashed
# and truncated to a safe row ID; run_id is already short and safe as-is.
ROW_ID_MAX_LEN = 36

tables_db: Optional[TablesDB] = None


def init_db():
    global tables_db
    if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
        logger.error("APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in environment variables.")
        return

    try:
        client = Client()
        client.set_endpoint(APPWRITE_ENDPOINT).set_project(APPWRITE_PROJECT_ID).set_key(APPWRITE_API_KEY)
        tables_db = TablesDB(client)
        logger.info("Appwrite TablesDB client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Appwrite client: {e}")


def _safe_row_id(raw: str) -> str:
    """Derive a valid Appwrite row ID (<=36 chars) from an arbitrary string key."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:ROW_ID_MAX_LEN]


def _is_not_found(e: Exception) -> bool:
    return isinstance(e, AppwriteException) and e.code == 404


def _enforce_max_size(table_id: str, max_size: int):
    """Delete the oldest rows once a table exceeds max_size entries.
    Appwrite caps list queries at 100 results per request, which matches
    every max_size default used by this module.
    """
    if not tables_db:
        return
    try:
        result = tables_db.list_rows(
            database_id=APPWRITE_DATABASE_ID,
            table_id=table_id,
            queries=[Query.order_asc("$createdAt"), Query.limit(100)]
        )
        rows = result.rows
        if len(rows) > max_size:
            for row in rows[: len(rows) - max_size]:
                tables_db.delete_row(database_id=APPWRITE_DATABASE_ID, table_id=table_id, row_id=row.id)
    except Exception as e:
        logger.error(f"Error enforcing max size on {table_id}: {e}")


# Cache Helpers
def get_cached_response(key: str) -> Optional[Dict[str, Any]]:
    if not tables_db:
        return None
    try:
        row = tables_db.get_row(database_id=APPWRITE_DATABASE_ID, table_id=TABLE_CACHE, row_id=_safe_row_id(key))
        raw = row.data.get("response_json")
        return json.loads(raw) if raw else None
    except AppwriteException as e:
        if not _is_not_found(e):
            logger.error(f"Error reading cache from Appwrite: {e}")
    except Exception as e:
        logger.error(f"Error reading cache from Appwrite: {e}")
    return None


def set_cached_response(key: str, response_json: Dict[str, Any], max_size: int = 100):
    if not tables_db:
        return
    try:
        tables_db.upsert_row(
            database_id=APPWRITE_DATABASE_ID,
            table_id=TABLE_CACHE,
            row_id=_safe_row_id(key),
            data={"response_json": json.dumps(response_json)}
        )
        _enforce_max_size(TABLE_CACHE, max_size)
    except Exception as e:
        logger.error(f"Error writing cache to Appwrite: {e}")


# Metrics Helpers
def get_metrics_history() -> List[Dict[str, Any]]:
    if not tables_db:
        return []
    try:
        result = tables_db.list_rows(
            database_id=APPWRITE_DATABASE_ID,
            table_id=TABLE_METRICS,
            queries=[Query.order_asc("$createdAt"), Query.limit(100)]
        )
        return [json.loads(row.data["metrics_json"]) for row in result.rows]
    except Exception as e:
        logger.error(f"Error reading metrics history from Appwrite: {e}")
    return []


def add_metrics_run(run: Dict[str, Any], max_size: int = 100):
    if not tables_db:
        return
    try:
        tables_db.create_row(
            database_id=APPWRITE_DATABASE_ID,
            table_id=TABLE_METRICS,
            row_id=ID.unique(),
            data={"metrics_json": json.dumps(run)}
        )
        _enforce_max_size(TABLE_METRICS, max_size)
    except Exception as e:
        logger.error(f"Error writing metrics to Appwrite: {e}")


# Conversation Session Helpers
def get_conversation_session(session_id: str) -> Optional[Dict[str, Any]]:
    if not tables_db:
        return None
    try:
        row = tables_db.get_row(database_id=APPWRITE_DATABASE_ID, table_id=TABLE_SESSIONS, row_id=_safe_row_id(session_id))
        raw = row.data.get("session_json")
        return json.loads(raw) if raw else None
    except AppwriteException as e:
        if not _is_not_found(e):
            logger.error(f"Error reading session from Appwrite: {e}")
    except Exception as e:
        logger.error(f"Error reading session from Appwrite: {e}")
    return None


def save_conversation_session(session_id: str, session_data: Dict[str, Any], max_size: int = 100):
    if not tables_db:
        return
    try:
        tables_db.upsert_row(
            database_id=APPWRITE_DATABASE_ID,
            table_id=TABLE_SESSIONS,
            row_id=_safe_row_id(session_id),
            data={
                "session_id": session_id[:128],
                "session_json": json.dumps(session_data)
            }
        )
        _enforce_max_size(TABLE_SESSIONS, max_size)
    except Exception as e:
        logger.error(f"Error writing session to Appwrite: {e}")


# Run Trace Helpers
def get_run_trace(run_id: str) -> Optional[List[Dict[str, Any]]]:
    if not tables_db:
        return None
    try:
        row = tables_db.get_row(database_id=APPWRITE_DATABASE_ID, table_id=TABLE_TRACES, row_id=run_id)
        raw = row.data.get("trace_json")
        return json.loads(raw) if raw else None
    except AppwriteException as e:
        if not _is_not_found(e):
            logger.error(f"Error reading trace from Appwrite: {e}")
    except Exception as e:
        logger.error(f"Error reading trace from Appwrite: {e}")
    return None


def save_run_trace(run_id: str, trace: List[Dict[str, Any]], max_size: int = 100):
    if not tables_db:
        return
    try:
        tables_db.upsert_row(
            database_id=APPWRITE_DATABASE_ID,
            table_id=TABLE_TRACES,
            row_id=run_id,
            data={"trace_json": json.dumps(trace)}
        )
        _enforce_max_size(TABLE_TRACES, max_size)
    except Exception as e:
        logger.error(f"Error writing trace to Appwrite: {e}")
