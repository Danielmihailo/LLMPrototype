import { query } from "../db/pool.js";

export async function retrieveMemoryFacts(
  userId: string,
  shopConnectionId: string | null,
  _queryText: string,
  limit = 5,
): Promise<string[]> {
  // Vector similarity not available (JSONB column, no pgvector).
  // Fall back to most-recently-accessed facts.
  const { rows } = await query<{ fact: string }>(
    `SELECT fact FROM memory_facts
     WHERE user_id = $1
     AND ($2::uuid IS NULL OR shop_connection_id = $2)
     ORDER BY last_accessed DESC
     LIMIT $3`,
    [userId, shopConnectionId, limit],
  );
  return rows.map((r) => r.fact);
}

export async function storeMemoryFact(
  userId: string,
  shopConnectionId: string | null,
  fact: string,
  importance = 1.0,
): Promise<void> {
  await query(
    `INSERT INTO memory_facts (user_id, shop_connection_id, fact, importance)
     VALUES ($1, $2, $3, $4)`,
    [userId, shopConnectionId, fact, importance],
  );
}
