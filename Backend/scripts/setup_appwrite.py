"""
One-time provisioning script: creates the Appwrite database, tables, columns,
and indexes that Nucleus needs (compression_cache, metrics_history,
conversation_sessions, run_traces, user_chat_history).

Run this once after creating your Appwrite project and generating a server
API key (Project Settings -> API Keys, needs the "databases.write" scope):

    python scripts/setup_appwrite.py

Safe to re-run: existing resources are detected (HTTP 409) and skipped.
"""
import os
import sys

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.enums.tables_db_index_type import TablesDBIndexType
from appwrite.exception import AppwriteException

load_dotenv()

APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID")
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY")
APPWRITE_DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID", "nucleus")

if not APPWRITE_PROJECT_ID or not APPWRITE_API_KEY:
    raise SystemExit("APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set (see Backend/.env.example).")

client = Client()
client.set_endpoint(APPWRITE_ENDPOINT).set_project(APPWRITE_PROJECT_ID).set_key(APPWRITE_API_KEY)
tables_db = TablesDB(client)


def _already_exists(e: AppwriteException) -> bool:
    return e.code == 409


def ensure_database():
    try:
        tables_db.create(database_id=APPWRITE_DATABASE_ID, name="Nucleus")
        print(f"Created database '{APPWRITE_DATABASE_ID}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"Database '{APPWRITE_DATABASE_ID}' already exists, skipping.")
        else:
            raise


def ensure_table(table_id: str, name: str, row_security: bool = False, permissions=None):
    try:
        tables_db.create_table(
            database_id=APPWRITE_DATABASE_ID,
            table_id=table_id,
            name=name,
            permissions=permissions or [],
            row_security=row_security,
        )
        print(f"Created table '{table_id}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"Table '{table_id}' already exists, skipping.")
        else:
            raise


def ensure_longtext_column(table_id: str, key: str):
    try:
        tables_db.create_longtext_column(database_id=APPWRITE_DATABASE_ID, table_id=table_id, key=key, required=True)
        print(f"  + column '{key}' (longtext) on '{table_id}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"  = column '{key}' already exists on '{table_id}', skipping.")
        else:
            raise


def ensure_mediumtext_column(table_id: str, key: str):
    try:
        tables_db.create_mediumtext_column(database_id=APPWRITE_DATABASE_ID, table_id=table_id, key=key, required=True)
        print(f"  + column '{key}' (mediumtext) on '{table_id}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"  = column '{key}' already exists on '{table_id}', skipping.")
        else:
            raise


def ensure_varchar_column(table_id: str, key: str, size: int, required: bool = True):
    try:
        tables_db.create_varchar_column(database_id=APPWRITE_DATABASE_ID, table_id=table_id, key=key, size=size, required=required)
        print(f"  + column '{key}' (varchar[{size}]) on '{table_id}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"  = column '{key}' already exists on '{table_id}', skipping.")
        else:
            raise


def ensure_index(table_id: str, key: str, index_type, columns):
    try:
        tables_db.create_index(database_id=APPWRITE_DATABASE_ID, table_id=table_id, key=key, type=index_type, columns=columns)
        print(f"  + index '{key}' on '{table_id}'.")
    except AppwriteException as e:
        if _already_exists(e):
            print(f"  = index '{key}' already exists on '{table_id}', skipping.")
        else:
            raise


def main():
    print(f"Provisioning Appwrite database '{APPWRITE_DATABASE_ID}' at {APPWRITE_ENDPOINT}...\n")
    ensure_database()

    # Backend-only tables: no client-side permissions are granted, since only
    # the FastAPI backend (authenticated with this server API key, which
    # bypasses all permission checks) ever reads or writes them.
    print("\ncompression_cache:")
    ensure_table("compression_cache", "Compression Cache")
    ensure_longtext_column("compression_cache", "response_json")

    print("\nmetrics_history:")
    ensure_table("metrics_history", "Metrics History")
    ensure_longtext_column("metrics_history", "metrics_json")

    print("\nconversation_sessions:")
    ensure_table("conversation_sessions", "Conversation Sessions")
    ensure_longtext_column("conversation_sessions", "session_json")
    ensure_varchar_column("conversation_sessions", "session_id", size=128)

    print("\nrun_traces:")
    ensure_table("run_traces", "Run Traces")
    ensure_longtext_column("run_traces", "trace_json")

    # Frontend-facing table: row security means each row's own permissions
    # decide who can read/update/delete it. Any signed-in user may create a
    # row; the browser SDK sets that row's permissions to the creating user
    # only (see frontend/src/app/app/page.tsx), so users can never see each
    # other's history. This API key only creates the schema, not the data.
    print("\nuser_chat_history:")
    ensure_table(
        "user_chat_history",
        "User Chat History",
        row_security=True,
        permissions=[Permission.create(Role.users())],
    )
    ensure_varchar_column("user_chat_history", "user_id", size=64)
    ensure_mediumtext_column("user_chat_history", "original_text")
    ensure_longtext_column("user_chat_history", "result_json")
    ensure_index("user_chat_history", "user_id_idx", TablesDBIndexType.KEY, ["user_id"])

    print("\nDone. Your Appwrite project is ready for Nucleus.")


if __name__ == "__main__":
    main()
