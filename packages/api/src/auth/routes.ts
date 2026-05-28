import { v4 as uuidv4 } from "uuid";
import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "../db/pool.js";
import {
  createSession,
  destroySession,
  getSessionToken,
  hashPassword,
  parseCookies,
  sessionCookieHeader,
  clearSessionCookie,
  verifyPassword,
  getUserIdFromSession,
} from "./session.js";
import { logAudit } from "../security/audit.js";

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

export async function handleRegister(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJson<{ email?: string; password?: string }>(req);
  if (!body.email || !body.password || body.password.length < 8) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid email or password (min 8 chars)" }));
    return;
  }
  const passwordHash = await hashPassword(body.password);
  const userId = uuidv4();
  try {
    await query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`,
      [userId, body.email.toLowerCase(), passwordHash],
    );
  } catch {
    res.writeHead(409, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Email already registered" }));
    return;
  }
  const token = await createSession(userId);
  await logAudit(userId, "register", { email: body.email });
  res.writeHead(201, {
    "Content-Type": "application/json",
    "Set-Cookie": sessionCookieHeader(token),
  });
  res.end(JSON.stringify({ user_id: userId }));
}

export async function handleLogin(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJson<{ email?: string; password?: string }>(req);
  const { rows } = await query<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [body.email?.toLowerCase()],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(user.password_hash, body.password ?? ""))) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid credentials" }));
    return;
  }
  const token = await createSession(user.id);
  await logAudit(user.id, "login", {});
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Set-Cookie": sessionCookieHeader(token),
  });
  res.end(JSON.stringify({ user_id: user.id }));
}

export async function handleLogout(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const cookies = parseCookies(req.headers.cookie);
  const token = getSessionToken(cookies);
  if (token) await destroySession(token);
  res.writeHead(204, { "Set-Cookie": clearSessionCookie() });
  res.end();
}

export async function requireAuth(
  req: IncomingMessage,
): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  return getUserIdFromSession(getSessionToken(cookies));
}
