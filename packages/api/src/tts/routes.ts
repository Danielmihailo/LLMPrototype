import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config.js";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

/**
 * POST /v1/tts
 * Body: { text: string }
 * Returns: audio/mpeg stream (OpenAI tts-1-hd, voice: nova)
 * If OPENAI_API_KEY is not set, returns 503 and the frontend falls back to Web Speech.
 */
export async function handleTTS(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!config.openaiApiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "TTS not configured (set OPENAI_API_KEY)" }));
    return;
  }

  let text = "";
  try {
    const body = JSON.parse(await readBody(req)) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  if (!text) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "text is required" }));
    return;
  }

  // Trim to 4096 chars (OpenAI limit per request)
  if (text.length > 4096) text = text.slice(0, 4096);

  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",        // tts-1-hd is higher quality but ~2x slower/cost
      input: text,
      voice: "nova",         // natural, warm female voice; try "onyx" for male
      response_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => "unknown error");
    console.error("[TTS] OpenAI error:", ttsRes.status, errText);
    res.writeHead(ttsRes.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: errText }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store",
  });

  // Stream audio back
  const reader = ttsRes.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}
