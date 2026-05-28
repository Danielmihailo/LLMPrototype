FROM python:3.11-slim

WORKDIR /app

# Build context is repo root, so paths are relative to repo root
COPY packages/brain/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/brain/ .

ENV PYTHONPATH=/app
ENV BRAIN_BACKEND=ollama
ENV BRAIN_OLLAMA_URL=http://ollama.railway.internal:11434
ENV BRAIN_OLLAMA_MODEL=llama3:8b

EXPOSE 8000

CMD ["uvicorn", "jarvis.inference.server:app", "--host", "0.0.0.0", "--port", "8000"]
