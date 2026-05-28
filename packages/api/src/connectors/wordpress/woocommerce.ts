import { query } from "../../db/pool.js";

async function wpFetch(
  metadata: Record<string, unknown>,
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const siteUrl = String(metadata.site_url ?? "").replace(/\/$/, "");
  const username = String(metadata.username ?? "");
  const appPassword = String(metadata.app_password ?? "");
  const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const res = await fetch(`${siteUrl}/wp-json/wp/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`WP API error: ${res.status}`);
  return res.json();
}

async function wooFetch(
  metadata: Record<string, unknown>,
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const siteUrl = String(metadata.site_url ?? "").replace(/\/$/, "");
  const consumerKey = String(metadata.consumer_key ?? metadata.username ?? "");
  const consumerSecret = String(metadata.consumer_secret ?? metadata.app_password ?? "");
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch(`${siteUrl}/wp-json/wc/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`WooCommerce API error: ${res.status}`);
  return res.json();
}

export async function execute(
  metadata: Record<string, unknown>,
  operation: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  switch (operation) {
    case "list_products":
      return wooFetch(metadata, "/products?per_page=10");
    case "create_page":
      return wpFetch(metadata, "/pages", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title ?? "New Page",
          content: payload.body ?? "",
          status: "draft",
        }),
      });
    case "update_price":
      return wooFetch(metadata, `/products/${payload.product_id}`, {
        method: "PUT",
        body: JSON.stringify({ regular_price: String(payload.price ?? "0") }),
      });
    case "swap_products":
      return {
        operation: "swap_products",
        from: payload.from_product_id,
        to: payload.to_product_id,
        platform: "wordpress",
      };
    default:
      throw new Error(`Unknown WordPress operation: ${operation}`);
  }
}
