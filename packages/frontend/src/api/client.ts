const BASE = "";

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function streamMessage(
  conversationId: string,
  text: string,
  onEvent: (type: string, data: unknown) => void,
): Promise<void> {
  const res = await fetch(`/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok || !res.body) throw new Error("Stream failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const lines = block.split("\n");
      const eventLine = lines.find((l) => l.startsWith("event: "));
      const dataLine = lines.find((l) => l.startsWith("data: "));
      if (eventLine && dataLine) {
        onEvent(eventLine.slice(7), JSON.parse(dataLine.slice(6)));
      }
    }
  }
}

export function connectShopWs(
  shopId: string,
  onProgress: (data: unknown) => void,
): WebSocket {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws/shop/${shopId}`);
  ws.onmessage = (ev) => onProgress(JSON.parse(ev.data));
  return ws;
}
