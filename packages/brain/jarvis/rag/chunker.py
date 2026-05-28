def chunk_text(text: str, size: int = 500, overlap: int = 50) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + size])
        start += size - overlap
    return chunks or [text]
