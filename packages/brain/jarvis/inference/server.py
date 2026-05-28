from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from jarvis.inference.engine import get_backend
from jarvis.prompts.wrapper import wrap_messages
from jarvis.rag.embedder import embed_texts

app = FastAPI(title="JARVIS Brain")
_backend = None


def backend():
    global _backend
    if _backend is None:
        _backend = get_backend()
    return _backend


class InferRequest(BaseModel):
    messages: list[dict[str, str]]
    shop_context: dict | None = None
    memory: list[str] | None = None


class EmbedRequest(BaseModel):
    texts: list[str]


@app.get("/internal/brain/health")
def health():
    b = backend()
    return {"model": b.model, "version": "1.0.0", "backend": b.name}


@app.post("/internal/brain/infer")
def infer(req: InferRequest):
    wrapped = wrap_messages(req.messages, req.shop_context, req.memory)
    result = backend().infer(wrapped)
    return result.model_dump()


@app.post("/internal/brain/infer/stream")
def infer_stream(req: InferRequest):
    wrapped = wrap_messages(req.messages, req.shop_context, req.memory)

    def generate():
        for chunk in backend().stream_infer(wrapped):
            # Convention: all backends yield tokens as strings, then a final JSON dump
            try:
                parsed = json.loads(chunk)
                if isinstance(parsed, dict) and "response_text" in parsed:
                    yield f"event: done\ndata: {chunk}\n\n"
                    return
            except (json.JSONDecodeError, TypeError):
                pass
            yield f"event: token\ndata: {json.dumps(chunk)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/internal/brain/embed")
def embed(req: EmbedRequest):
    vectors = embed_texts(req.texts)
    return {"vectors": vectors}
