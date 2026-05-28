import { query } from "../db/pool.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_ACTIONS = 10;

export async function checkRateLimit(
  key: string,
  max: number = MAX_REQUESTS,
): Promise<boolean> {
  const { rows } = await query<{ count: number; window_start: Date }>(
    `SELECT count, window_start FROM rate_limit_counters WHERE key = $1`,
    [key],
  );
  const now = Date.now();
  if (rows.length === 0) {
    await query(
      `INSERT INTO rate_limit_counters (key, count, window_start) VALUES ($1, 1, now())`,
      [key],
    );
    return true;
  }
  const row = rows[0];
  const windowStart = new Date(row.window_start).getTime();
  if (now - windowStart > WINDOW_MS) {
    await query(
      `UPDATE rate_limit_counters SET count = 1, window_start = now() WHERE key = $1`,
      [key],
    );
    return true;
  }
  if (row.count >= max) return false;
  await query(
    `UPDATE rate_limit_counters SET count = count + 1 WHERE key = $1`,
    [key],
  );
  return true;
}

export async function checkUserRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(`user:${userId}`, MAX_REQUESTS);
}

export async function checkActionRateLimit(userId: string): Promise<boolean> {
  return checkRateLimit(`action:${userId}`, MAX_ACTIONS);
}
