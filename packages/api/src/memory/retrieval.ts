import { query } from "../db/pool.js";
import { brainEmbed } from "../brain-client/infer.js";

export async function retrieveMemoryFacts(
  userId: string,
  shopConnectionId: string | null,
  queryText: string,
  limit = 5,
): Promise<string[]> {
  let vectors: number[][];
  try {
    vectors = await brainEmbed([queryText]);
  } catch {
    const { rows } = await query<{ fact: string }>(
      `SELECT fact FROM memory_facts WHERE user_id = $1 ORDER BY last_accessed DESC LIMIT $2`,
      [userId, limit],
    );
    return rows.map((r) => r.fact);
  }
  const embedding = `[${vectors[0].join(",")}]`;
  const { rows } = await query<{ fact: string }>(
    `SELECT fact FROM memory_facts
     WHERE user_id = $1
     AND ($2::uuid IS NULL OR shop_connection_id = $2)
     AND embedding IS NOT NULL
     ORDER BY embedding <=> $3::vector
     LIMIT $4`,
    [userId, shopConnectionId, embedding, limit],
  );
  return rows.map((r) => r.fact);
}

export async function storeMemoryFact(
  userId: string,
  shopConnectionId: string | null,
  fact: string,
  importance = 1.0,
): Promise<void> {
  let embedding: string | null = null;
  try {
    const vectors = await brainEmbed([fact]);
    embedding = `[${vectors[0].join(",")}]`;
  } catch {
    /* store without embedding */
  }
  await query(
    `INSERT INTO memory_facts (user_id, shop_connection_id, fact, importance, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [userId, shopConnectionId, fact, importance, embedding],
  );
}
