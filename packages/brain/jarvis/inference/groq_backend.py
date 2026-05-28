from __future__ import annotations

import json
import os
from typing import Generator

import httpx

from jarvis.prompts.output_schema import JarvisOutput, parse_output


class GroqBackend:
    name = "groq"

    def __init__(self) -> None:
        self.api_key = os.environ.get("GROQ_API_KEY", "")
        self.model = os.environ.get("BRAIN_GROQ_MODEL", "llama-3.1-8b-instant")
        self.base_url = "https://api.groq.com/openai/v1"

    def _parse_result(self, content: str) -> JarvisOutput:
        try:
            return parse_output(content)
        except Exception:
            return JarvisOutput(response_text=content.strip(), actions=[], confidence=0.5)

    def infer(self, messages: list[dict]) -> JarvisOutput:
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": messages},
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        return self._parse_result(content)

    def stream_infer(self, messages: list[dict]) -> Generator[str, None, None]:
        collected = ""
        with httpx.Client(timeout=120) as client:
            with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": messages, "stream": True},
            ) as resp:
                if resp.status_code >= 400:
                    body = resp.read().decode()
                    raise RuntimeError(f"Groq {resp.status_code}: {body}")
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:]
                    if payload.strip() == "[DONE]":
                        break
                    try:
                        delta = json.loads(payload)["choices"][0]["delta"].get("content", "")
                        if delta:
                            collected += delta
                            yield delta
                    except Exception:
                        continue

        # Final yield: parsed InferResult as JSON so server.py detects end
        result = self._parse_result(collected)
        yield json.dumps(result.model_dump())
