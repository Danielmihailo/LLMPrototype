-- JARVIS schema migration 001
-- pgvector is optional; if unavailable embeddings are stored as JSONB
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS vector; EXCEPTION WHEN OTHERS THEN NULL; END $$;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'wordpress', 'greenfield')),
  external_shop_id TEXT NOT NULL,
  display_name TEXT,
  oauth_tokens_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'error')),
  connected_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS shop_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_connection_id UUID NOT NULL REFERENCES shop_connections(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_connection_id UUID REFERENCES shop_connections(id) ON DELETE SET NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'jarvis', 'system')),
  modality TEXT NOT NULL DEFAULT 'text' CHECK (modality IN ('text', 'voice')),
  content TEXT NOT NULL,
  audio_meta JSONB,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_connection_id UUID REFERENCES shop_connections(id) ON DELETE SET NULL,
  fact TEXT NOT NULL,
  importance REAL DEFAULT 1.0,
  embedding JSONB,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_connection_id UUID NOT NULL REFERENCES shop_connections(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  plan JSONB NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID NOT NULL REFERENCES ai_actions(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  connector TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'planned',
  result JSONB
);

CREATE TABLE IF NOT EXISTS knowledge_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'web', 'crawl')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL
);

CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES doc_chunks(id) ON DELETE CASCADE,
  embedding JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS model_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_model TEXT NOT NULL,
  adapter_path TEXT,
  merged_path TEXT,
  version TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_user ON memory_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_shop ON ai_actions(shop_connection_id);
CREATE INDEX IF NOT EXISTS idx_shop_connections_user ON shop_connections(user_id);
