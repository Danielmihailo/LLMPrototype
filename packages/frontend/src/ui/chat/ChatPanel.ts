import { api, streamMessage } from "../../api/client.js";
import { patchState, getState } from "../../app/state.js";

export class ChatPanel {
  private container: HTMLElement;
  private onPulse: (v: number) => void;

  constructor(container: HTMLElement, onPulse: (v: number) => void) {
    this.container = container;
    this.onPulse = onPulse;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="chat-panel">
        <div id="messages" class="messages"></div>
        <div id="action-preview" class="action-preview hidden"></div>
        <form id="chat-form" class="chat-form">
          <input id="chat-input" type="text" placeholder="Sprich mit JARVIS…" autocomplete="off" />
          <button type="submit">Senden</button>
        </form>
      </div>`;

    const style = document.createElement("style");
    style.textContent = `
      .chat-panel { max-width: 720px; margin: 0 auto; }
      .messages { min-height: 300px; max-height: 50vh; overflow-y: auto; padding: 1rem; background: rgba(15,23,42,0.8); border: 1px solid var(--jarvis-accent-dim); border-radius: 8px; }
      .msg { margin-bottom: 0.75rem; }
      .msg.user { color: var(--jarvis-muted); }
      .msg.jarvis { color: var(--jarvis-accent); text-shadow: 0 0 8px rgba(34,211,238,0.3); }
      .chat-form { display: flex; gap: 0.5rem; margin-top: 1rem; }
      .chat-form input { flex: 1; background: var(--jarvis-surface); border: 1px solid var(--jarvis-accent-dim); color: var(--jarvis-text); padding: 0.75rem; border-radius: 4px; }
      .chat-form button { background: var(--jarvis-accent-dim); color: white; border: none; padding: 0 1.25rem; border-radius: 4px; cursor: pointer; }
      .action-preview { margin-top: 1rem; padding: 1rem; border: 1px solid var(--jarvis-accent); border-radius: 8px; background: rgba(34,211,238,0.05); }
      .hidden { display: none; }
    `;
    if (!document.getElementById("chat-styles")) {
      style.id = "chat-styles";
      document.head.appendChild(style);
    }

    const form = this.container.querySelector("#chat-form") as HTMLFormElement;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.send();
    });
  }

  private async ensureConversation(): Promise<string> {
    const state = getState();
    if (state.conversationId) return state.conversationId;
    const shop_connection_id = state.shopConnectionId;
    const res = await api<{ conversation_id: string }>("/v1/conversations", {
      method: "POST",
      body: JSON.stringify({ shop_connection_id, title: "JARVIS" }),
    });
    patchState({ conversationId: res.conversation_id });
    return res.conversation_id;
  }

  private appendMessage(role: string, text: string): HTMLElement {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.textContent = text;
    const box = this.container.querySelector("#messages") as HTMLElement;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  async send(text?: string): Promise<void> {
    // Auth check — show clear message if not logged in
    const state = getState();
    if (!state.userId) {
      this.appendMessage("jarvis", "⚠ Bitte zuerst einloggen — klick oben rechts auf Login.");
      return;
    }

    const input = this.container.querySelector("#chat-input") as HTMLInputElement;
    const message = text ?? input.value.trim();
    if (!message) return;
    input.value = "";
    this.appendMessage("user", message);
    this.onPulse(0.8);

    const jarvisEl = this.appendMessage("jarvis", "…");
    let full = "";

    try {
      const convId = await this.ensureConversation();
      jarvisEl.textContent = "";

      await streamMessage(convId, message, (type, data) => {
        if (type === "token") {
          full += String(data);
          jarvisEl.textContent = full;
        }
        if (type === "action_plan") {
          const preview = this.container.querySelector("#action-preview") as HTMLElement;
          preview.classList.remove("hidden");
          const actions = (data as { actions: unknown[] }).actions;
          preview.innerHTML = `<strong>Geplante Aktionen:</strong><pre>${JSON.stringify(actions, null, 2)}</pre>
            <button id="confirm-action">Bestätigen & ausführen</button>`;
          (preview as unknown as { _pendingActionId?: string })._pendingActionId = undefined;
        }
        if (type === "done") {
          this.onPulse(0.2);
          const d = data as { action_id?: string };
          const preview = this.container.querySelector("#action-preview") as HTMLElement;
          if (d.action_id) {
            (preview as unknown as { _pendingActionId?: string })._pendingActionId = d.action_id;
          }
          preview.querySelector("#confirm-action")?.addEventListener("click", () => {
            void this.confirmLastAction(preview);
          });
        }
      });
    } catch (err) {
      jarvisEl.textContent = `⚠ Fehler: ${String(err)}`;
      this.onPulse(0.1);
    }
  }

  private async confirmLastAction(preview: HTMLElement): Promise<void> {
    const actionId = (preview as unknown as { _pendingActionId?: string })._pendingActionId;
    if (!actionId) return;
    await api(`/v1/actions/${actionId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ approved: true }),
    });
    this.appendMessage("jarvis", "Aktion ausgeführt.");
  }
}
