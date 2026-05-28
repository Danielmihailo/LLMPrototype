"""vLLM backend stub for production GPU deployment."""
from __future__ import annotations

import os
from jarvis.inference.mock_backend import MockBackend


class VllmBackend(MockBackend):
    """Falls back to mock until vLLM server is configured."""

    name = "vllm"

    def __init__(self) -> None:
        self.model = os.environ.get("VLLM_MODEL", "Llama-3.2-3B-Instruct")
        self.vllm_url = os.environ.get("VLLM_URL", "")
        if self.vllm_url:
            self.name = "vllm-live"
        else:
            super().__init__()
