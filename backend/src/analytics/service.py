import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any


logger = logging.getLogger("healthsaathi-analytics")


# Reuse the existing HealthSaathi SQLite database.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "healthsaathi.db"

VALID_OUTCOMES = {"SUCCESS", "FAILED"}


def get_connection() -> sqlite3.Connection:
    """Create a connection to the existing HealthSaathi SQLite database."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_analytics_table() -> None:
    """Create the call_analytics table if it does not already exist."""
    try:
        with get_connection() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS call_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    call_id TEXT UNIQUE NOT NULL,
                    caller_id TEXT,
                    started_at TEXT NOT NULL,
                    ended_at TEXT NOT NULL,
                    duration_seconds INTEGER NOT NULL,
                    channel TEXT NOT NULL,
                    outcome TEXT NOT NULL
                        CHECK (outcome IN ('SUCCESS', 'FAILED')),
                    failure_reason TEXT
                )
                """
            )

            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_call_analytics_outcome
                ON call_analytics(outcome)
                """
            )

            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_call_analytics_started_at
                ON call_analytics(started_at)
                """
            )

            connection.commit()

        logger.info("Call analytics table initialized successfully.")

    except sqlite3.Error:
        logger.exception("Failed to initialize call analytics table.")
        raise


def _parse_timestamp(timestamp: str) -> datetime:
    """Parse an ISO timestamp and ensure it is timezone-aware."""
    value = timestamp.strip()

    if not value:
        raise ValueError("Timestamp cannot be empty.")

    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(
            f"Invalid ISO timestamp: {timestamp}"
        ) from exc

    if parsed.tzinfo is None:
        raise ValueError(
            "Timestamp must include timezone information."
        )

    return parsed


def _calculate_duration(
    started_at: str,
    ended_at: str,
) -> int:
    """Calculate a non-negative call duration in seconds."""
    started = _parse_timestamp(started_at)
    ended = _parse_timestamp(ended_at)

    duration = int((ended - started).total_seconds())

    if duration < 0:
        raise ValueError(
            "ended_at cannot be earlier than started_at."
        )

    return duration


def record_call(
    call_id: str,
    caller_id: str | None,
    started_at: str,
    ended_at: str,
    channel: str,
    outcome: str,
    failure_reason: str | None = None,
) -> bool:
    """
    Record one completed call in the analytics database.

    Returns True when the call is successfully persisted.
    Duplicate call IDs are ignored safely.
    """
    call_id = call_id.strip()
    channel = channel.strip()
    outcome = outcome.strip().upper()

    if not call_id:
        raise ValueError("call_id cannot be empty.")

    if not channel:
        raise ValueError("channel cannot be empty.")

    if outcome not in VALID_OUTCOMES:
        raise ValueError(
            f"Invalid outcome '{outcome}'. "
            "Expected SUCCESS or FAILED."
        )

    duration_seconds = _calculate_duration(
        started_at,
        ended_at,
    )

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO call_analytics (
                    call_id,
                    caller_id,
                    started_at,
                    ended_at,
                    duration_seconds,
                    channel,
                    outcome,
                    failure_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    call_id,
                    caller_id,
                    started_at,
                    ended_at,
                    duration_seconds,
                    channel,
                    outcome,
                    failure_reason,
                ),
            )

            connection.commit()

            if cursor.rowcount == 0:
                logger.warning(
                    "Duplicate call analytics record ignored: %s",
                    call_id,
                )
                return False

        logger.info(
            "Call analytics persisted: call_id=%s outcome=%s",
            call_id,
            outcome,
        )

        return True

    except sqlite3.Error:
        logger.exception(
            "Failed to persist call analytics: %s",
            call_id,
        )
        return False


def get_call_counts() -> dict[str, int]:
    """Return total, successful, and failed call counts from SQLite."""
    try:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT
                    COUNT(*) AS total_calls,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN outcome = 'SUCCESS' THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS successful_calls,
                    COALESCE(
                        SUM(
                            CASE
                                WHEN outcome = 'FAILED' THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS failed_calls
                FROM call_analytics
                """
            ).fetchone()

        return {
            "total_calls": int(row["total_calls"]),
            "successful_calls": int(row["successful_calls"]),
            "failed_calls": int(row["failed_calls"]),
        }

    except sqlite3.Error:
        logger.exception(
            "Failed to retrieve call analytics counts."
        )

        return {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
        }


def get_recent_calls(
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    Return recent call analytics records.

    Caller identity is intentionally excluded because it is not
    necessary for the basic analytics dashboard.
    """
    if limit <= 0:
        return []

    try:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT
                    call_id,
                    started_at,
                    ended_at,
                    duration_seconds,
                    channel,
                    outcome,
                    failure_reason
                FROM call_analytics
                ORDER BY started_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [dict(row) for row in rows]

    except sqlite3.Error:
        logger.exception(
            "Failed to retrieve recent call analytics."
        )
        return []