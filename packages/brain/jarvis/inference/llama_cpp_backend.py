"""llama.cpp GGUF backend — optional dependency."""
from __future__ import annotations

import json
import os
from jarvis.prompts.output_schema import JarvisOutput, parse_output


class LlamaCppBackend:
    name = "llama.cpp"
    model = "Qwen2.5-0.5B-Instruct"

    def __init__(self) -> None:
        path = os.environ.get("BRAIN_GGUF_PATH", "")
        if not path or not os.path.isfile(path):
            raise FileNotFoundError(f"GGUF not found: {path}")
        from llama_cpp import Llama

        self.llm = Llama(model_path=path, n_ctx=4096, verbose=False)
        self.model = os.path.basename(path)

    def infer(self, messages: list[dict[str, str]]) -> JarvisOutput:
        out = self.llm.create_chat_completion(messages=messages, max_tokens=512)
        raw = out["choices"][0]["message"]["content"]
        try:
            return parse_output(raw)
        except Exception:
            return JarvisOutput(response_text=raw.strip(), actions=[], confidence=0.5)

    def stream_infer(self, messages: list[dict[str, str]]):
        stream = self.llm.create_chat_completion(messages=messages, max_tokens=512, stream=True)
        full = ""
        for chunk in stream:
            delta = chunk["choices"][0]["delta"].get("content") or ""
            if delta:
                full += delta
                yield delta
        try:
            result = parse_output(full)
        except Exception:
            result = JarvisOutput(response_text=full.strip(), actions=[], confidence=0.5)
        yield json.dumps(result.model_dump())
