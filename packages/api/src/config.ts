export const config = {
  port: parseInt(process.env.API_PORT ?? "3001", 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://jarvis:jarvis@localhost:5432/jarvis",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
  brainUrl: process.env.BRAIN_URL ?? "http://localhost:8000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    apiSecret: process.env.SHOPIFY_API_SECRET ?? "",
    scopes:
      process.env.SHOPIFY_SCOPES ??
      "read_products,write_products,read_content,write_content",
  },
  encryptionKey: process.env.ENCRYPTION_KEY ?? "0123456789abcdef0123456789abcdef",
};
