"""Fine-tuning dataset loader and validator."""
from __future__ import annotations

import json
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def validate_example(row: dict) -> bool:
    messages = row.get("messages", [])
    if len(messages) < 2:
        return False
    assistant = next((m for m in messages if m.get("role") == "assistant"), None)
    if not assistant:
        return False
    try:
        data = json.loads(assistant["content"])
        return "response_text" in data and "actions" in data
    except json.JSONDecodeError:
        return False
