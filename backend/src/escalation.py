import logging
import sqlite3
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("healthsaathi-escalation")

DB_PATH = "healthsaathi.db"


def initialize_escalation_table() -> None:
    """Create the human escalation table if it does not exist."""

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS escalations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference_id TEXT UNIQUE NOT NULL,
                caller_id TEXT NOT NULL,
                summary TEXT NOT NULL,
                urgency TEXT NOT NULL,
                language TEXT,
                follow_up_method TEXT,
                status TEXT NOT NULL DEFAULT 'OPEN',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def create_escalation(
    caller_id: str,
    summary: str,
    urgency: str,
    language: str,
    follow_up_method: str,
) -> str:
    """Create a human-help request and return its reference ID."""

    initialize_escalation_table()

    reference_id = f"HS-{uuid.uuid4().hex[:8].upper()}"
    created_at = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO escalations (
                reference_id,
                caller_id,
                summary,
                urgency,
                language,
                follow_up_method,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
            """,
            (
                reference_id,
                caller_id,
                summary,
                urgency,
                language,
                follow_up_method,
                created_at,
            ),
        )
        conn.commit()

    logger.info(
        "Human escalation created: %s | urgency=%s",
        reference_id,
        urgency,
    )

    return reference_id