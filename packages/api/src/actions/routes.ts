import type { IncomingMessage, ServerResponse } from "node:http";
import { confirmAction, getAction, rollbackAction } from "./engine.js";

export async function handleGetAction(
  actionId: string,
  res: ServerResponse,
): Promise<void> {
  const action = await getAction(actionId);
  if (!action) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ action, steps: action.steps }));
}

export async function handleConfirmAction(
  actionId: string,
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as {
    approved?: boolean;
  };
  const result = await confirmAction(actionId, userId, body.approved ?? false);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}

export async function handleRollbackAction(
  actionId: string,
  userId: string,
  res: ServerResponse,
): Promise<void> {
  const result = await rollbackAction(actionId, userId);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result));
}
