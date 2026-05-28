import { query } from "../db/pool.js";
import { decryptJson } from "../auth/session.js";
import * as shopify from "./shopify/products.js";
import * as wordpress from "./wordpress/woocommerce.js";
import * as greenfield from "./greenfield/runtime.js";

export async function executeConnectorStep(
  shopConnectionId: string,
  connector: string,
  operation: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { rows } = await query<{
    platform: string;
    oauth_tokens_encrypted: string | null;
    external_shop_id: string;
    metadata: Record<string, unknown>;
  }>(`SELECT platform, oauth_tokens_encrypted, external_shop_id, metadata FROM shop_connections WHERE id = $1`, [
    shopConnectionId,
  ]);
  const shop = rows[0];
  if (!shop) throw new Error("Shop not found");

  const tokens = shop.oauth_tokens_encrypted
    ? decryptJson<Record<string, string>>(shop.oauth_tokens_encrypted)
    : {};

  switch (connector) {
    case "shopify":
      return shopify.execute(shop.external_shop_id, tokens, operation, payload);
    case "wordpress":
      return wordpress.execute(shop.metadata ?? {}, operation, payload);
    case "greenfield":
      return greenfield.execute(shopConnectionId, operation, payload);
    default:
      if (shop.platform === connector) {
        return executeConnectorStep(shopConnectionId, shop.platform, operation, payload);
      }
      throw new Error(`Unknown connector: ${connector}`);
  }
}
