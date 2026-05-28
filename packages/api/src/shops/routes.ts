import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { encryptJson } from "../auth/session.js";
import * as shopifyOAuth from "../connectors/shopify/oauth.js";
import * as shopifyProducts from "../connectors/shopify/products.js";
import { createGreenfieldShop } from "../connectors/greenfield/runtime.js";

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as T;
}

export async function handleListShops(
  userId: string,
  res: ServerResponse,
): Promise<void> {
  const { rows } = await query(
    `SELECT id, user_id, platform, external_shop_id, display_name, status, connected_at
     FROM shop_connections WHERE user_id = $1 ORDER BY connected_at DESC`,
    [userId],
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ shops: rows }));
}

export async function handleShopifyStart(
  userId: string,
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const shop = url.searchParams.get("shop");
  if (!shop) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "shop query param required" }));
    return;
  }
  const oauthUrl = shopifyOAuth.startOAuth(userId, shop);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ oauth_url: oauthUrl }));
}

export async function handleShopifyCallback(
  url: URL,
  res: ServerResponse,
): Promise<void> {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");
  if (!code || !state || !shop) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing OAuth params" }));
    return;
  }
  const result = await shopifyOAuth.handleCallback(code, state, shop);
  if (!result) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OAuth failed" }));
    return;
  }
  const id = uuidv4();
  const tokens = encryptJson({ access_token: result.accessToken });
  await query(
    `INSERT INTO shop_connections (id, user_id, platform, external_shop_id, display_name, oauth_tokens_encrypted, status)
     VALUES ($1, $2, 'shopify', $3, $4, $5, 'active')`,
    [id, result.userId, result.shop, result.shop, tokens],
  );
  try {
    const snapshot = await shopifyProducts.fetchShopSnapshot(
      result.shop,
      result.accessToken,
    );
    await query(
      `INSERT INTO shop_snapshots (shop_connection_id, snapshot) VALUES ($1, $2)`,
      [id, JSON.stringify(snapshot)],
    );
  } catch {
    /* snapshot optional */
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ shop_connection_id: id }));
}

export async function handleWordPressConnect(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJson<{
    site_url?: string;
    username?: string;
    app_password?: string;
  }>(req);
  if (!body.site_url || !body.username || !body.app_password) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "site_url, username, app_password required" }));
    return;
  }
  const id = uuidv4();
  await query(
    `INSERT INTO shop_connections (id, user_id, platform, external_shop_id, display_name, metadata, status)
     VALUES ($1, $2, 'wordpress', $3, $4, $5, 'active')`,
    [
      id,
      userId,
      new URL(body.site_url).hostname,
      body.site_url,
      JSON.stringify({
        site_url: body.site_url,
        username: body.username,
        app_password: body.app_password,
      }),
    ],
  );
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ shop_connection_id: id }));
}

export async function handleGreenfieldCreate(
  userId: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await readJson<{ name?: string; domain?: string }>(req);
  const { deploy_url, shop_data } = await createGreenfieldShop(
    body.name ?? "My Shop",
    body.domain,
  );
  const id = uuidv4();
  await query(
    `INSERT INTO shop_connections (id, user_id, platform, external_shop_id, display_name, metadata, status)
     VALUES ($1, $2, 'greenfield', $3, $4, $5, 'active')`,
    [
      id,
      userId,
      id,
      body.name ?? "My Shop",
      JSON.stringify({ shop_data, deploy_url }),
    ],
  );
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ shop_connection_id: id, deploy_url }));
}
