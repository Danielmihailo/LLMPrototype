# JARVIS Architecture

See the Architectural Decree in the project plan. This repo implements:

- **packages/api** — Orchestrator (Node HTTP, PostgreSQL, connectors)
- **packages/brain** — Self-hosted SLM inference (llama.cpp / vLLM / mock)
- **packages/frontend** — Custom WebGPU SPA with voice UI

Data never leaves your infrastructure. No OpenAI/Anthropic API calls.
