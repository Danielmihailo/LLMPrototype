import type { BrainInferResponse } from "@jarvis/shared";
import { config } from "../config.js";

export async function brainInfer(payload: {
  messages: Array<{ role: string; content: string }>;
  shop_context?: Record<string, unknown>;
  memory?: string[];
}): Promise<BrainInferResponse> {
  const res = await fetch(`${config.brainUrl}/internal/brain/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Brain infer failed: ${res.status}`);
  }
  return res.json() as Promise<BrainInferResponse>;
}

export async function brainInferStream(
  payload: {
    messages: Array<{ role: string; content: string }>;
    shop_context?: Record<string, unknown>;
    memory?: string[];
  },
  onToken: (token: string) => void,
): Promise<BrainInferResponse> {
  const res = await fetch(`${config.brainUrl}/internal/brain/infer/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Brain stream failed: ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: BrainInferResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (!dataLine) continue;
      const eventType = eventLine?.slice(7).trim();
      const rawData = dataLine.slice(6);
      if (eventType === "token") {
        try { onToken(JSON.parse(rawData) as string); } catch { onToken(rawData); }
      } else if (eventType === "done") {
        try { finalResult = JSON.parse(rawData) as BrainInferResponse; } catch { /* ignore */ }
      }
    }
  }
  if (!finalResult) {
    throw new Error("Stream ended without result");
  }
  return finalResult;
}

export async function brainEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${config.brainUrl}/internal/brain/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`Brain embed failed: ${res.status}`);
  const json = (await res.json()) as { vectors: number[][] };
  return json.vectors;
}
