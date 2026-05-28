import type { SseEvent } from "../types/shop.js";

export type { SseEvent, SseEventType } from "../types/shop.js";

export function formatSse(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
