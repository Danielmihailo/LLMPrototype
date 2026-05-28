import { query } from "../db/pool.js";

export async function logAudit(
  userId: string | null,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`,
    [userId, action, JSON.stringify(metadata)],
  );
}
