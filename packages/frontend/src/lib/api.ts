async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    req<{ user_id: string }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    req<{ user_id: string }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => req("/v1/auth/logout", { method: "POST" }),

  listShops: () => req<{ shops: Shop[] }>("/v1/shops"),

  /** Returns the Shopify OAuth URL. Caller should redirect window.location. */
  getShopifyOAuthUrl: (shop: string) =>
    req<{ oauth_url: string }>(
      `/v1/shops/connect/shopify/start?shop=${encodeURIComponent(shop)}`,
    ),

  connectWordPress: (siteUrl: string, username: string, appPassword: string) =>
    req<{ shop_connection_id: string }>("/v1/shops/connect/wordpress", {
      method: "POST",
      body: JSON.stringify({ site_url: siteUrl, username, app_password: appPassword }),
    }),

  createConversation: (shopConnectionId?: string) =>
    req<{ conversation_id: string }>("/v1/conversations", {
      method: "POST",
      body: JSON.stringify({ shop_connection_id: shopConnectionId ?? null }),
    }),

  listMessages: (conversationId: string) =>
    req<{ messages: Message[] }>(`/v1/conversations/${conversationId}/messages`),

  confirmAction: (actionId: string) =>
    req(`/v1/actions/${actionId}/confirm`, { method: "POST", body: "{}" }),

  rollbackAction: (actionId: string) =>
    req(`/v1/actions/${actionId}/rollback`, { method: "POST", body: "{}" }),
};

export async function streamMessage(
  conversationId: string,
  text: string,
  onToken: (token: string) => void,
): Promise<{ actions: Action[]; action_id: string | null }> {
  const res = await fetch(`/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok || !res.body) throw new Error(`Stream failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneData: { actions: Action[]; action_id: string | null } = {
    actions: [],
    action_id: null,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      if (!part.trim()) continue;
      const lines = part.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (!dataLine) continue;

      const eventType = eventLine?.slice(7).trim();
      const raw = dataLine.slice(6);

      if (eventType === "token") {
        try {
          onToken(JSON.parse(raw) as string);
        } catch {
          onToken(raw);
        }
      } else if (eventType === "done") {
        try {
          const parsed = JSON.parse(raw) as {
            actions?: Action[];
            action_id?: string | null;
          };
          doneData = {
            actions: parsed.actions ?? [],
            action_id: parsed.action_id ?? null,
          };
        } catch {
          // ignore
        }
      }
    }
  }

  return doneData;
}

export interface Shop {
  id: string;
  name: string;
  platform: string;
  domain?: string;
}

export interface Message {
  id: string;
  role: "user" | "jarvis";
  content: string;
  created_at: string;
  tool_calls?: string;
}

export interface Action {
  type: string;
  payload?: Record<string, unknown>;
}
