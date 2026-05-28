export const config = {
  port: parseInt(process.env.API_PORT ?? "3001", 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://jarvis:jarvis@localhost:5432/jarvis",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
  brainUrl: process.env.BRAIN_URL ?? "http://localhost:8000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  // Public URL of this API (used for OAuth redirect URIs)
  apiUrl:
    process.env.API_PUBLIC_URL ??
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3001",
  shopify: {
    // Support both SHOPIFY_CLIENT_ID and legacy SHOPIFY_API_KEY
    apiKey:    process.env.SHOPIFY_CLIENT_ID    ?? process.env.SHOPIFY_API_KEY    ?? "",
    apiSecret: process.env.SHOPIFY_CLIENT_SECRET ?? process.env.SHOPIFY_API_SECRET ?? "",
    scopes:
      process.env.SHOPIFY_SCOPES ??
      "read_products,write_products,read_orders,write_orders,read_customers,write_customers," +
      "read_inventory,write_inventory,read_price_rules,write_price_rules," +
      "read_discounts,write_discounts,read_content,write_content," +
      "read_themes,write_themes,read_analytics,read_reports," +
      "read_fulfillments,write_fulfillments,read_shipping,write_shipping",
  },
  encryptionKey: process.env.ENCRYPTION_KEY ?? "0123456789abcdef0123456789abcdef",
  // Optional: high-quality TTS via OpenAI (tts-1-hd). Falls back to Web Speech if not set.
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
