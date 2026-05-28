import type { WebSocket } from "ws";
import type { WsProgressEvent } from "@jarvis/shared";

const shopSockets = new Map<string, Set<WebSocket>>();

export function subscribeShop(shopConnectionId: string, ws: WebSocket): void {
  if (!shopSockets.has(shopConnectionId)) {
    shopSockets.set(shopConnectionId, new Set());
  }
  shopSockets.get(shopConnectionId)!.add(ws);
  ws.on("close", () => {
    shopSockets.get(shopConnectionId)?.delete(ws);
  });
}

export function broadcastProgress(
  shopConnectionId: string,
  event: WsProgressEvent,
): void {
  const sockets = shopSockets.get(shopConnectionId);
  if (!sockets) return;
  const payload = JSON.stringify(event);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}
