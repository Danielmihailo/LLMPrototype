FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV BRAIN_BACKEND=ollama
ENV BRAIN_OLLAMA_URL=http://ollama.railway.internal:11434
ENV BRAIN_OLLAMA_MODEL=llama3:8b

EXPOSE 8000

CMD ["uvicorn", "jarvis.inference.server:app", "--host", "0.0.0.0", "--port", "8000"]
