"""Ollama backend — local LLM inference, no extra Python deps needed."""
from __future__ import annotations

import json
import os

import httpx

from jarvis.prompts.output_schema import JarvisOutput, parse_output


class OllamaBackend:
    name = "ollama"

    def __init__(self) -> None:
        self.base_url = os.environ.get("BRAIN_OLLAMA_URL", "http://localhost:11434")
        self.model = os.environ.get("BRAIN_OLLAMA_MODEL", "llama3:8b")

    def infer(self, messages: list[dict[str, str]]) -> JarvisOutput:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            raw = resp.json()["message"]["content"]
        try:
            return parse_output(raw)
        except Exception:
            return JarvisOutput(response_text=raw.strip(), actions=[], confidence=0.7)

    def stream_infer(self, messages: list[dict[str, str]]):
        full = ""
        with httpx.Client(timeout=120) as client:
            with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": True},
            ) as resp:
                for line in resp.iter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        full += token
                        yield token
        try:
            result = parse_output(full)
        except Exception:
            result = JarvisOutput(response_text=full.strip(), actions=[], confidence=0.7)
        yield json.dumps(result.model_dump())
