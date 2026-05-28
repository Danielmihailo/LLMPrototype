#!/bin/bash
set -e

MODEL=${OLLAMA_MODEL:-llama3:8b}

echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 1
done
echo "Ollama ready."

# Pull model if not already cached (Railway Volume keeps it persistent)
if ! ollama list | grep -q "$MODEL"; then
  echo "Pulling model $MODEL (first run — this takes a few minutes)..."
  ollama pull "$MODEL"
  echo "Model pulled successfully."
else
  echo "Model $MODEL already cached."
fi

echo "JARVIS Brain ready on port 11434."
wait $OLLAMA_PID
