import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# Store the database in the backend directory.
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "healthsaathi.db"


def get_connection() -> sqlite3.Connection:
    """Create a connection to the HealthSaathi SQLite database."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    """Create the users table if it does not already exist."""
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                language_preference TEXT,
                age_band TEXT,
                last_triage_outcome TEXT,
                last_interaction TEXT NOT NULL
            )
            """
        )

        connection.commit()


def lookup_user(user_id: str) -> dict[str, Any] | None:
    """Look up a returning HealthSaathi user by their user ID."""
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                user_id,
                name,
                language_preference,
                age_band,
                last_triage_outcome,
                last_interaction
            FROM users
            WHERE user_id = ?
            """,
            (user_id,),
        ).fetchone()

    if row is None:
        return None

    return dict(row)


def save_user(
    user_id: str,
    name: str,
    language_preference: str | None = None,
    age_band: str | None = None,
    last_triage_outcome: str | None = None,
) -> dict[str, Any]:
    """Create or update a user's consented memory."""
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO users (
                user_id,
                name,
                language_preference,
                age_band,
                last_triage_outcome,
                last_interaction
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                name = excluded.name,
                language_preference = excluded.language_preference,
                age_band = excluded.age_band,
                last_triage_outcome = excluded.last_triage_outcome,
                last_interaction = excluded.last_interaction
            """,
            (
                user_id,
                name,
                language_preference,
                age_band,
                last_triage_outcome,
                now,
            ),
        )

        connection.commit()

    return {
        "user_id": user_id,
        "name": name,
        "language_preference": language_preference,
        "age_band": age_band,
        "last_triage_outcome": last_triage_outcome,
        "last_interaction": now,
    }