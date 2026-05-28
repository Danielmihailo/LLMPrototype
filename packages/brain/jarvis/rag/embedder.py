"""Self-hosted embeddings — hash fallback when sentence-transformers unavailable."""
from __future__ import annotations

import hashlib
import math

DIM = 384


def _hash_embed(text: str) -> list[float]:
    vec = [0.0] * DIM
    for i, token in enumerate(text.lower().split()):
        h = hashlib.sha256(f"{i}:{token}".encode()).digest()
        for j in range(DIM):
            vec[j] += (h[j % len(h)] / 255.0 - 0.5) / (i + 1)
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return model.encode(texts, normalize_embeddings=True).tolist()
    except Exception:
        return [_hash_embed(t) for t in texts]
