"""Benchmark inference latency."""
from __future__ import annotations

import time

from jarvis.inference.engine import get_backend
from jarvis.prompts.wrapper import wrap_messages


def main() -> None:
    backend = get_backend()
    messages = wrap_messages([{"role": "user", "content": "Liste alle Produkte"}])
    start = time.perf_counter()
    result = backend.infer(messages)
    elapsed = time.perf_counter() - start
    print(f"Backend: {backend.name} | Model: {backend.model}")
    print(f"Latency: {elapsed:.3f}s")
    print(f"Actions: {len(result.actions)}")


if __name__ == "__main__":
    main()
