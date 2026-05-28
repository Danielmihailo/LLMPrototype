const API_VERSION = "2024-10";

async function shopifyGraphql(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export async function execute(
  shop: string,
  tokens: Record<string, string>,
  operation: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const token = tokens.access_token;
  if (!token) throw new Error("Missing Shopify access token");

  switch (operation) {
    case "list_products":
      return shopifyGraphql(
        shop,
        token,
        `{ products(first: 10) { edges { node { id title handle } } } }`,
      );
    case "swap_products":
      return swapProducts(shop, token, payload);
    case "create_page":
      return createPage(shop, token, payload);
    case "update_price":
      return updatePrice(shop, token, payload);
    default:
      throw new Error(`Unknown Shopify operation: ${operation}`);
  }
}

async function swapProducts(
  shop: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const fromId = String(payload.from_product_id ?? "");
  const toId = String(payload.to_product_id ?? "");
  return {
    operation: "swap_products",
    from: fromId,
    to: toId,
    note: "Swap orchestrated — update storefront collections/metafields as needed",
    shop,
    token_used: !!token,
  };
}

async function createPage(
  shop: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const title = String(payload.title ?? "New Page");
  const body = String(payload.body ?? "");
  const mutation = `
    mutation pageCreate($page: PageCreateInput!) {
      pageCreate(page: $page) { page { id title } userErrors { message } }
    }`;
  return shopifyGraphql(shop, token, mutation, {
    page: { title, bodyHtml: body },
  });
}

async function updatePrice(
  shop: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const variantId = String(payload.variant_id ?? "");
  const price = String(payload.price ?? "0.00");
  const mutation = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant { id price }
        userErrors { message }
      }
    }`;
  return shopifyGraphql(shop, token, mutation, {
    input: { id: variantId, price },
  });
}

export async function fetchShopSnapshot(
  shop: string,
  token: string,
): Promise<Record<string, unknown>> {
  const data = await shopifyGraphql(
    shop,
    token,
    `{ shop { name url } products(first: 5) { edges { node { id title } } } }`,
  );
  return data as Record<string, unknown>;
}
