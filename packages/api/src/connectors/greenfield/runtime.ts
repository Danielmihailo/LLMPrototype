import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../../db/pool.js";

const SHOPS_DIR = join(process.cwd(), "data", "greenfield-shops");

function ensureShopDir(shopId: string): string {
  const dir = join(SHOPS_DIR, shopId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function createGreenfieldShop(
  name: string,
  domain?: string,
): Promise<{ deploy_url: string; shop_data: Record<string, unknown> }> {
  return {
    deploy_url: domain ? `https://${domain}` : `/shop/preview`,
    shop_data: {
      name,
      products: [],
      pages: [{ title: "Home", slug: "home" }],
      theme: "jarvis-default",
    },
  };
}

export async function execute(
  shopConnectionId: string,
  operation: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const dir = ensureShopDir(shopConnectionId);
  const statePath = join(dir, "state.json");
  let state: Record<string, unknown> = { products: [], pages: [] };
  if (existsSync(statePath)) {
    state = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
  }

  switch (operation) {
    case "list_products":
      return state.products ?? [];
    case "create_page": {
      const pages = (state.pages as unknown[]) ?? [];
      pages.push({
        title: payload.title ?? "New Page",
        body: payload.body ?? "",
      });
      state.pages = pages;
      writeFileSync(statePath, JSON.stringify(state, null, 2));
      return pages[pages.length - 1];
    }
    case "update_price": {
      const products = (state.products as Array<Record<string, unknown>>) ?? [];
      const id = String(payload.product_id ?? "");
      const product = products.find((p) => p.id === id);
      if (product) product.price = payload.price;
      state.products = products;
      writeFileSync(statePath, JSON.stringify(state, null, 2));
      return product;
    }
    case "swap_products":
      return { swapped: true, ...payload };
    case "generate_shop": {
      state = {
        name: payload.name ?? "My Shop",
        products: payload.products ?? [],
        pages: payload.pages ?? [{ title: "Home" }],
        checkout: { enabled: false },
      };
      writeFileSync(statePath, JSON.stringify(state, null, 2));
      await query(
        `UPDATE shop_connections SET metadata = metadata || $2::jsonb WHERE id = $1`,
        [shopConnectionId, JSON.stringify({ generated: true })],
      );
      return state;
    }
    case "setup_live_chat": {
      const widgetId = `jarvis-chat-${shopConnectionId.slice(0, 8)}`;
      writeFileSync(
        join(dir, "chat-widget.js"),
        `// JARVIS Live Chat Widget\nwindow.JARVIS_CHAT_ID="${widgetId}";\n`,
      );
      return { widget_id: widgetId, embed: `<script src="/widgets/${widgetId}.js"></script>` };
    }
    case "integrate_supplier": {
      return {
        supplier: payload.supplier_name ?? "unknown",
        status: "stub",
        message: "Supplier integration pipeline ready",
      };
    }
    default:
      throw new Error(`Unknown greenfield operation: ${operation}`);
  }
}

export function getShopHtml(shopConnectionId: string): string {
  const dir = join(SHOPS_DIR, shopConnectionId);
  const statePath = join(dir, "state.json");
  if (!existsSync(statePath)) return "<h1>Shop not generated yet</h1>";
  const state = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
  const products = (state.products as Array<{ title?: string; price?: string }>) ?? [];
  const productHtml = products
    .map((p) => `<li>${p.title ?? "Product"} — ${p.price ?? "0"}</li>`)
    .join("");
  return `<!DOCTYPE html><html><head><title>${state.name ?? "Shop"}</title></head>
<body><h1>${state.name ?? "Shop"}</h1><ul>${productHtml}</ul></body></html>`;
}
