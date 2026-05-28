import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { URL } from "node:url";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import {
  handleLogin,
  handleLogout,
  handleRegister,
  requireAuth,
} from "./auth/routes.js";
import {
  handleListShops,
  handleShopifyStart,
  handleShopifyCallback,
  handleWordPressConnect,
  handleGreenfieldCreate,
} from "./shops/routes.js";
import {
  handleCreateConversation,
  handleListMessages,
  handleSendMessage,
} from "./conversations/routes.js";
import {
  handleConfirmAction,
  handleGetAction,
  handleRollbackAction,
} from "./actions/routes.js";
import { handleUploadDoc, handleWebFetch } from "./knowledge/routes.js";
import {
  handleDeleteAccount,
  handleExportAccount,
  handleListModels,
  handlePromoteModel,
} from "./account/routes.js";
import { checkUserRateLimit } from "./security/rate-limit.js";
import { subscribeShop } from "./ws/hub.js";
import { getShopHtml } from "./connectors/greenfield/runtime.js";

function corsHeaders(origin?: string): Record<string, string> {
  const allowed = config.frontendUrl;
  return {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

async function handleRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);
  const path = url.pathname;
  const method = req.method ?? "GET";
  const headers = corsHeaders(req.headers.origin);

  if (method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  try {
    if (path === "/v1/auth/register" && method === "POST") {
      await handleRegister(req, res);
      return;
    }
    if (path === "/v1/auth/login" && method === "POST") {
      await handleLogin(req, res);
      return;
    }
    if (path === "/v1/auth/logout" && method === "POST") {
      await handleLogout(req, res);
      return;
    }

    const userId = await requireAuth(req);
    if (userId && !(await checkUserRateLimit(userId))) {
      res.writeHead(429, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Rate limit exceeded" }));
      return;
    }

    if (path === "/v1/shops" && method === "GET" && userId) {
      res.writeHead(200, headers);
      await handleListShops(userId, res);
      return;
    }
    if (path === "/v1/shops/connect/shopify/start" && method === "GET" && userId) {
      res.writeHead(200, headers);
      await handleShopifyStart(userId, url, res);
      return;
    }
    if (path === "/v1/shops/connect/shopify/callback" && method === "GET") {
      res.writeHead(200, headers);
      await handleShopifyCallback(url, res);
      return;
    }
    if (path === "/v1/shops/connect/wordpress" && method === "POST" && userId) {
      res.writeHead(201, headers);
      await handleWordPressConnect(userId, req, res);
      return;
    }
    if (path === "/v1/shops/greenfield" && method === "POST" && userId) {
      res.writeHead(201, headers);
      await handleGreenfieldCreate(userId, req, res);
      return;
    }

    if (path === "/v1/conversations" && method === "POST" && userId) {
      res.writeHead(201, headers);
      await handleCreateConversation(userId, req, res);
      return;
    }

    const msgMatch = path.match(/^\/v1\/conversations\/([^/]+)\/messages$/);
    if (msgMatch && userId) {
      if (method === "GET") {
        res.writeHead(200, headers);
        await handleListMessages(msgMatch[1], userId, res);
        return;
      }
      if (method === "POST") {
        Object.assign(res, { _cors: headers });
        await handleSendMessage(msgMatch[1], userId, req, res);
        return;
      }
    }

    const actionMatch = path.match(/^\/v1\/actions\/([^/]+)(\/confirm|\/rollback)?$/);
    if (actionMatch && userId) {
      const [, actionId, sub] = actionMatch;
      if (sub === "/confirm" && method === "POST") {
        res.writeHead(200, headers);
        await handleConfirmAction(actionId, userId, req, res);
        return;
      }
      if (sub === "/rollback" && method === "POST") {
        res.writeHead(200, headers);
        await handleRollbackAction(actionId, userId, res);
        return;
      }
      if (!sub && method === "GET") {
        res.writeHead(200, headers);
        await handleGetAction(actionId, res);
        return;
      }
    }

    if (path === "/v1/knowledge/docs" && method === "POST" && userId) {
      res.writeHead(201, headers);
      await handleUploadDoc(userId, req, res);
      return;
    }
    if (path === "/v1/knowledge/web-fetch" && method === "POST" && userId) {
      res.writeHead(201, headers);
      await handleWebFetch(userId, req, res);
      return;
    }

    if (path === "/v1/account/export" && method === "GET" && userId) {
      res.writeHead(200, headers);
      await handleExportAccount(userId, res);
      return;
    }
    if (path === "/v1/account/delete" && method === "DELETE" && userId) {
      res.writeHead(204, headers);
      await handleDeleteAccount(userId, res);
      return;
    }

    if (path === "/v1/admin/models" && method === "GET" && userId) {
      res.writeHead(200, headers);
      await handleListModels(res);
      return;
    }
    const promoteMatch = path.match(/^\/v1\/admin\/models\/([^/]+)\/promote$/);
    if (promoteMatch && method === "POST" && userId) {
      res.writeHead(200, headers);
      await handlePromoteModel(res, promoteMatch[1]);
      return;
    }

    const previewMatch = path.match(/^\/v1\/greenfield\/([^/]+)\/preview$/);
    if (previewMatch && method === "GET") {
      const html = getShopHtml(previewMatch[1]);
      res.writeHead(200, { ...headers, "Content-Type": "text/html" });
      res.end(html);
      return;
    }

    const widgetMatch = path.match(/^\/widgets\/(.+)\.js$/);
    if (widgetMatch && method === "GET") {
      res.writeHead(200, { ...headers, "Content-Type": "application/javascript" });
      res.end(`window.JARVIS_CHAT_ID="${widgetMatch[1]}";console.log("JARVIS Live Chat active");`);
      return;
    }

    if (path === "/health") {
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { ...headers, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function main(): Promise<void> {
  await migrate();
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error(err);
      res.writeHead(500);
      res.end();
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://localhost:${config.port}`);
    const match = url.pathname.match(/^\/ws\/shop\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      subscribeShop(match[1], ws);
    });
  });

  server.listen(config.port, () => {
    console.log(`JARVIS API listening on :${config.port}`);
  });
}

main().catch(console.error);
