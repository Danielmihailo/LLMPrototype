import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config.js";

/**
 * POST /v1/stt
 * Content-Type: audio/webm  (or audio/ogg, audio/mp4, audio/wav …)
 * Body: raw audio binary
 *
 * Returns: { text: string }
 *
 * Uses Groq's Whisper-large-v3-turbo (fast, accurate, free tier included).
 * GROQ_API_KEY must be set in Railway env vars.
 */
export async function handleSTT(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!config.groqApiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "STT not configured (set GROQ_API_KEY)" }));
    return;
  }

  // Read raw audio bytes
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length < 100) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Audio too short" }));
    return;
  }

  const contentType = (req.headers["content-type"] ?? "audio/webm").split(";")[0].trim();
  // Map content-type to a filename Groq accepts
  const extMap: Record<string, string> = {
    "audio/webm": "audio.webm",
    "audio/ogg":  "audio.ogg",
    "audio/mp4":  "audio.mp4",
    "audio/mpeg": "audio.mp3",
    "audio/wav":  "audio.wav",
    "audio/flac": "audio.flac",
  };
  const filename = extMap[contentType] ?? "audio.webm";

  // Build multipart/form-data for Groq
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: contentType }), filename);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", "de");
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const groqRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.groqApiKey}` },
      body: formData,
    },
  );

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "unknown");
    console.error("[STT] Groq error:", groqRes.status, errText);
    res.writeHead(groqRes.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: errText }));
    return;
  }

  const data = await groqRes.json() as { text?: string };
  const text = (data.text ?? "").trim();

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ text }));
}
