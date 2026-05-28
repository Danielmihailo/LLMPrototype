import { config } from "../../config.js";
import { randomBytes } from "node:crypto";

const pendingOAuth = new Map<string, { userId: string; shop: string }>();

export function startOAuth(userId: string, shop: string): string {
  const state = randomBytes(16).toString("hex");
  pendingOAuth.set(state, { userId, shop });
  const redirectUri = `${config.frontendUrl}/shops/shopify/callback`;
  const params = new URLSearchParams({
    client_id: config.shopify.apiKey,
    scope: config.shopify.scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params}`;
}

export async function handleCallback(
  code: string,
  state: string,
  shop: string,
): Promise<{ userId: string; accessToken: string; shop: string } | null> {
  const pending = pendingOAuth.get(state);
  if (!pending) return null;
  pendingOAuth.delete(state);

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.shopify.apiKey,
      client_secret: config.shopify.apiSecret,
      code,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string };
  return {
    userId: pending.userId,
    accessToken: json.access_token,
    shop: pending.shop || shop,
  };
}
