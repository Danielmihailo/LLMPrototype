import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { brainEmbed } from "../brain-client/infer.js";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function handleUploadDoc(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readBody(req);
  const contentType = req.headers["content-type"] ?? "";
  let filename = "upload.txt";
  let content = body.toString("utf8");

  if (contentType.includes("multipart/form-data")) {
    const boundary = contentType.split("boundary=")[1];
    const parts = body.toString("binary").split(`--${boundary}`);
    for (const part of parts) {
      if (part.includes("filename=")) {
        const match = part.match(/filename="([^"]+)"/);
        if (match) filename = match[1];
        const idx = part.indexOf("\r\n\r\n");
        if (idx >= 0) content = part.slice(idx + 4).replace(/\r\n--$/, "").trim();
      }
    }
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const storageKey = `${uuidv4()}-${filename}`;
  writeFileSync(join(UPLOAD_DIR, storageKey), content);

  const docId = uuidv4();
  await query(
    `INSERT INTO knowledge_docs (id, user_id, filename, storage_key, source) VALUES ($1, $2, $3, $4, 'upload')`,
    [docId, userId, filename, storageKey],
  );

  await indexDocument(docId, content);
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ doc_id: docId }));
}

export async function handleWebFetch(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = JSON.parse((await readBody(req)).toString("utf8")) as { url?: string };
  if (!body.url) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "url required" }));
    return;
  }
  const fetched = await fetch(body.url);
  const content = await fetched.text();
  const docId = uuidv4();
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const storageKey = `${uuidv4()}-web.txt`;
  writeFileSync(join(UPLOAD_DIR, storageKey), content.slice(0, 50000));
  await query(
    `INSERT INTO knowledge_docs (id, user_id, filename, storage_key, source) VALUES ($1, $2, $3, $4, 'web')`,
    [docId, userId, body.url, storageKey],
  );
  await indexDocument(docId, content.slice(0, 50000));
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ doc_id: docId }));
}

async function indexDocument(docId: string, content: string): Promise<void> {
  const chunks = chunkText(content, 500);
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = uuidv4();
    await query(
      `INSERT INTO doc_chunks (id, doc_id, content, chunk_index) VALUES ($1, $2, $3, $4)`,
      [chunkId, docId, chunks[i], i],
    );
    try {
      const vectors = await brainEmbed([chunks[i]]);
      await query(
        `INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES ($1, $2::vector)`,
        [chunkId, `[${vectors[0].join(",")}]`],
      );
    } catch {
      /* embed when brain available */
    }
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length ? chunks : [text];
}
