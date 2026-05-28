import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import * as argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { config } from "../config.js";

const SESSION_COOKIE = "jarvis_session";
const SESSION_DAYS = 14;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, tokenHash, expiresAt.toISOString()],
  );
  return token;
}

export async function getUserIdFromSession(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { rows } = await query<{ user_id: string }>(
    `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash],
  );
  return rows[0]?.user_id ?? null;
}

export async function destroySession(token: string): Promise<void> {
  await query(`DELETE FROM sessions WHERE token_hash = $1`, [
    hashToken(token),
  ]);
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [k, ...v] = part.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }),
  );
}

export function sessionCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getSessionToken(
  cookies: Record<string, string>,
): string | undefined {
  return cookies[SESSION_COOKIE];
}

const ENC_KEY = Buffer.from(config.encryptionKey.slice(0, 32).padEnd(32, "0"));

export function encryptJson(data: unknown): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const json = JSON.stringify(data);
  const enc = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptJson<T>(payload: string): T {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const enc = buf.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
  return JSON.parse(json) as T;
}

export { SESSION_COOKIE };
