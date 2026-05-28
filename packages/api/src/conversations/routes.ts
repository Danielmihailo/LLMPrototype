import type { IncomingMessage, ServerResponse } from "node:http";
import { v4 as uuidv4 } from "uuid";
import { formatSse } from "@jarvis/shared";
import { query } from "../db/pool.js";
import { brainInferStream } from "../brain-client/infer.js";
import { retrieveMemoryFacts, storeMemoryFact } from "../memory/retrieval.js";
import { createActionFromPlan } from "../actions/engine.js";

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

export async function handleCreateConversation(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJson<{ shop_connection_id?: string; title?: string }>(req);
  const id = uuidv4();
  await query(
    `INSERT INTO conversations (id, user_id, shop_connection_id, title) VALUES ($1, $2, $3, $4)`,
    [id, userId, body.shop_connection_id ?? null, body.title ?? "JARVIS Chat"],
  );
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ conversation_id: id }));
}

export async function handleListMessages(
  conversationId: string,
  userId: string,
  res: ServerResponse,
): Promise<void> {
  const { rows: conv } = await query(
    `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  if (!conv.length) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  const { rows } = await query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at`,
    [conversationId],
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ messages: rows }));
}

export async function handleSendMessage(
  conversationId: string,
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const { rows: convRows } = await query<{
    shop_connection_id: string | null;
  }>(`SELECT shop_connection_id FROM conversations WHERE id = $1 AND user_id = $2`, [
    conversationId,
    userId,
  ]);
  if (!convRows.length) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  const contentType = req.headers["content-type"] ?? "";
  let text = "";
  if (contentType.includes("application/json")) {
    const body = await readJson<{ text?: string }>(req);
    text = body.text ?? "";
  } else {
    const body = await readJson<{ text?: string }>(req);
    text = body.text ?? "";
  }

  if (!text.trim()) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "text required" }));
    return;
  }

  await query(
    `INSERT INTO messages (id, conversation_id, role, modality, content) VALUES ($1, $2, 'user', 'text', $3)`,
    [uuidv4(), conversationId, text],
  );

  const { rows: history } = await query<{ role: string; content: string }>(
    `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [conversationId],
  );

  const memory = await retrieveMemoryFacts(
    userId,
    convRows[0].shop_connection_id,
    text,
  );

  let shopContext: Record<string, unknown> = {};
  if (convRows[0].shop_connection_id) {
    const { rows: snap } = await query<{ snapshot: Record<string, unknown> }>(
      `SELECT snapshot FROM shop_snapshots WHERE shop_connection_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [convRows[0].shop_connection_id],
    );
    shopContext = snap[0]?.snapshot ?? {};
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let fullResponse = "";
  const result = await brainInferStream(
    {
      messages: history.reverse().map((m) => ({
        role: m.role === "jarvis" ? "assistant" : m.role,
        content: m.content,
      })),
      shop_context: shopContext,
      memory,
    },
    (token) => {
      fullResponse += token;
      res.write(formatSse({ type: "token", data: token }));
    },
  );

  res.write(
    formatSse({
      type: "action_plan",
      data: { actions: result.actions, confidence: result.confidence },
    }),
  );

  let actionId: string | null = null;
  if (result.actions.length > 0 && convRows[0].shop_connection_id) {
    actionId = await createActionFromPlan(
      convRows[0].shop_connection_id,
      conversationId,
      result as unknown as Record<string, unknown>,
      result.actions,
    );
  }

  await query(
    `INSERT INTO messages (id, conversation_id, role, modality, content, tool_calls) VALUES ($1, $2, 'jarvis', 'text', $3, $4)`,
    [
      uuidv4(),
      conversationId,
      result.response_text,
      JSON.stringify({ actions: result.actions, action_id: actionId }),
    ],
  );

  if (result.response_text.length > 20) {
    await storeMemoryFact(
      userId,
      convRows[0].shop_connection_id,
      `User asked: ${text.slice(0, 100)}`,
    );
  }

  res.write(formatSse({ type: "done", data: { action_id: actionId, ...result } }));
  res.end();
}
