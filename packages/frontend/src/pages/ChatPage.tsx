import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, CheckCircle, XCircle, Zap, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";
import { api, streamMessage, type Message, type Action } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "jarvis";
  content: string;
  streaming?: boolean;
}

interface ActionState {
  actions: Action[];
  actionId: string | null;
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-1.5 rounded-full bg-cyan-400"
          animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 size-8 rounded-full flex items-center justify-center border ${
          isUser
            ? "bg-cyan-500/20 border-cyan-500/30"
            : "bg-white/5 border-white/10"
        }`}
      >
        {isUser ? (
          <User className="size-4 text-cyan-400" />
        ) : (
          <Zap className="size-4 text-cyan-400" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))" }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-cyan-500/15 border border-cyan-500/25 text-slate-200 rounded-br-sm"
            : "bg-white/5 border border-white/10 text-slate-300 rounded-bl-sm"
        }`}
      >
        {msg.streaming && !msg.content ? (
          <StreamingDots />
        ) : (
          <span>{msg.content}</span>
        )}
        {msg.streaming && msg.content && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

export function ChatPage() {
  const { state, dispatch } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init: require login, create conversation
  useEffect(() => {
    if (!state.userId) {
      dispatch({ type: "NAVIGATE", payload: "login" });
      return;
    }
    if (!state.conversationId) {
      api
        .createConversation()
        .then(({ conversation_id }) =>
          dispatch({ type: "SET_CONVERSATION", payload: conversation_id }),
        )
        .catch(() => setError("Konnte Konversation nicht erstellen"));
    }
  }, [state.userId, state.conversationId, dispatch]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !state.conversationId || sending) return;
    const text = input.trim();
    setInput("");
    setError("");
    setActionState(null);
    setSending(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const jarvisMsg: ChatMessage = { id: crypto.randomUUID(), role: "jarvis", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, jarvisMsg]);

    try {
      const result = await streamMessage(
        state.conversationId,
        text,
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === jarvisMsg.id
                ? { ...m, content: m.content + token }
                : m,
            ),
          );
        },
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === jarvisMsg.id ? { ...m, streaming: false } : m)),
      );

      if (result.actions.length > 0) {
        setActionState({ actions: result.actions, actionId: result.action_id });
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === jarvisMsg.id
            ? { ...m, content: "⚠ Fehler: " + String(err), streaming: false }
            : m,
        ),
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const handleConfirm = async () => {
    if (!actionState?.actionId) return;
    await api.confirmAction(actionState.actionId).catch(() => {});
    setActionState(null);
  };

  const handleRollback = async () => {
    if (!actionState?.actionId) return;
    await api.rollbackAction(actionState.actionId).catch(() => {});
    setActionState(null);
  };

  return (
    <div className="min-h-screen flex flex-col pt-20 pb-4 px-4">
      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 pt-2"
        >
          <div className="size-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Bot className="size-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">JARVIS</span>
              <NeonBadge color="cyan" pulse className="text-[9px] px-1.5 py-0.5">Live</NeonBadge>
            </div>
            <p className="text-xs text-slate-600">Shop Operating System · Groq llama-3.1-8b</p>
          </div>
        </motion.div>

        {/* Messages */}
        <GlassCard
          intensity="light"
          hover="none"
          padding="none"
          className="flex-1 flex flex-col min-h-[400px] max-h-[calc(100vh-280px)] overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center h-full gap-3 py-12"
              >
                <div className="size-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Zap
                    className="size-7 text-cyan-400"
                    style={{ filter: "drop-shadow(0 0 10px rgba(34,211,238,0.7))" }}
                  />
                </div>
                <p className="text-slate-500 text-sm">Wie kann ich dir helfen?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Zeig meine Produkte",
                    "Erstelle einen Rabatt",
                    "Was läuft heute gut?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 text-xs rounded-lg glass text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </AnimatePresence>

            {/* Action plan */}
            <AnimatePresence>
              {actionState && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <GlassCard intensity="medium" hover="none" padding="sm" className="border-cyan-500/25">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300">Geplante Aktionen</span>
                      <NeonBadge color="orange">{actionState.actions.length} Aktion{actionState.actions.length !== 1 ? "en" : ""}</NeonBadge>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {actionState.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                          <div className="size-1.5 rounded-full bg-cyan-400/60" />
                          <span className="font-mono">{a.type}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirm}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all"
                      >
                        <CheckCircle className="size-3.5" />
                        Bestätigen
                      </button>
                      <button
                        onClick={handleRollback}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all"
                      >
                        <XCircle className="size-3.5" />
                        Abbrechen
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/5 p-3">
            {error && (
              <div className="mb-2 px-3 py-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Sprich mit JARVIS…"
                disabled={sending || !state.conversationId}
                className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all duration-200 disabled:opacity-50"
              />
              <GradientButton
                gradient="cyan"
                size="md"
                className="px-4 shrink-0"
                onClick={() => void send()}
                disabled={sending || !input.trim() || !state.conversationId}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </GradientButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
