"""Server-Sent Events helpers."""

from __future__ import annotations

import json
from typing import Any, Dict


def format_sse(event: str, payload: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n"
