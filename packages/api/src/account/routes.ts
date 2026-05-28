import type { ServerResponse } from "node:http";
import { query } from "../db/pool.js";
import { logAudit } from "../security/audit.js";

export async function handleExportAccount(
  userId: string,
  res: ServerResponse,
): Promise<void> {
  const [user, shops, conversations, memory] = await Promise.all([
    query(`SELECT id, email, preferences, created_at FROM users WHERE id = $1`, [userId]),
    query(`SELECT * FROM shop_connections WHERE user_id = $1`, [userId]),
    query(`SELECT * FROM conversations WHERE user_id = $1`, [userId]),
    query(`SELECT fact, created_at FROM memory_facts WHERE user_id = $1`, [userId]),
  ]);
  await logAudit(userId, "gdpr_export", {});
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      user: user.rows[0],
      shops: shops.rows,
      conversations: conversations.rows,
      memory: memory.rows,
    }),
  );
}

export async function handleDeleteAccount(
  userId: string,
  res: ServerResponse,
): Promise<void> {
  await logAudit(userId, "gdpr_delete", {});
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
  res.writeHead(204);
  res.end();
}

export async function handlePromoteModel(
  res: ServerResponse,
  version: string,
): Promise<void> {
  await query(`UPDATE model_registry SET is_active = false`);
  await query(
    `UPDATE model_registry SET is_active = true WHERE version = $1`,
    [version],
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ promoted: version }));
}

export async function handleListModels(res: ServerResponse): Promise<void> {
  const { rows } = await query(`SELECT * FROM model_registry ORDER BY created_at DESC`);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ models: rows }));
}
