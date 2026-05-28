# JARVIS — AI Shop Operating System

Voice-first AI assistant for Shopify, WordPress, and greenfield shops. Self-hosted inference, 100% data sovereignty.

## Quick start

```bash
# Prerequisites: Node 20+, Python 3.11+, Docker (PostgreSQL)
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Brain: http://localhost:8000

## Structure

- `packages/api` — TypeScript orchestrator (auth, shops, actions, RAG)
- `packages/frontend` — Custom WebGPU SPA
- `packages/brain` — Python inference + fine-tuning
- `packages/shared` — Shared TypeScript types

See `docs/architecture.md` for the full Architectural Decree.
