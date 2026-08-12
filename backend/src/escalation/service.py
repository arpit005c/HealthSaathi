import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("healthsaathi-escalation")

STORE_PATH = Path(__file__).resolve().parent / "escalation_store.json"


def initialize_escalation_table() -> None:
    """Create the escalation JSON store if it does not exist."""

    if not STORE_PATH.exists():
        STORE_PATH.write_text("[]", encoding="utf-8")


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

    escalation = {
        "reference_id": reference_id,
        "caller_id": caller_id,
        "summary": summary,
        "urgency": urgency,
        "language": language,
        "follow_up_method": follow_up_method,
        "status": "OPEN",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        existing = json.loads(
            STORE_PATH.read_text(encoding="utf-8")
        )

        if not isinstance(existing, list):
            existing = []

    except (json.JSONDecodeError, OSError):
        existing = []

    existing.append(escalation)

    STORE_PATH.write_text(
        json.dumps(existing, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    logger.info(
        "Human escalation created: %s | urgency=%s",
        reference_id,
        urgency,
    )

    return reference_id