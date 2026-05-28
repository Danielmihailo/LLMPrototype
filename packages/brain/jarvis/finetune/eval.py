"""Evaluate action JSON accuracy on curated dataset."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from jarvis.finetune.dataset import load_jsonl, validate_example
from jarvis.inference.mock_backend import MockBackend


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    args = parser.parse_args()
    rows = load_jsonl(args.data)
    backend = MockBackend()
    ok = 0
    total = 0
    for row in rows:
        if not validate_example(row):
            continue
        total += 1
        user_msg = next(m for m in row["messages"] if m["role"] == "user")
        expected = json.loads(next(m for m in row["messages"] if m["role"] == "assistant")["content"])
        result = backend.infer([{"role": "user", "content": user_msg["content"]}])
        if result.actions and expected.get("actions"):
            if result.actions[0].operation == expected["actions"][0]["operation"]:
                ok += 1
    pct = (ok / total * 100) if total else 0
    print(f"Intent accuracy: {ok}/{total} ({pct:.1f}%)")
    if pct < 85:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
