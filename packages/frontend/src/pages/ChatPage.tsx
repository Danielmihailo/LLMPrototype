import { useState, useEffect, useRef, Suspense, lazy, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";
import { api, streamMessage, type Action } from "@/lib/api";
import { useSpeech } from "@/hooks/useSpeech";
import type { OrbState } from "@/components/3d/ChatOrb";

const ChatOrb = lazy(() =>
  import("@/components/3d/ChatOrb").then((m) => ({ default: m.ChatOrb })),
);

/* ── types ─────────────────────────────────────────────────────────── */
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

/* ── sound wave (TTS indicator) ─────────────────────────────────────── */
function SoundWave() {
  return (
    <div className="flex items-end gap-[3px] h-4 ml-1">
      {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.85].map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-cyan-400 rounded-full"
          animate={{ scaleY: [h * 0.3, h, h * 0.3] }}
          transition={{ duration: 0.6 + i * 0.05, repeat: Infinity, delay: i * 0.07, ease: "easeInOut" }}
          style={{ originY: 1, height: "16px" }}
        />
      ))}
    </div>
  );
}

/* ── streaming dots ──────────────────────────────────────────────────── */
function StreamingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-1.5 rounded-full bg-cyan-400"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.3, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  );
}

/* ── message bubble ──────────────────────────────────────────────────── */
function MessageBubble({ msg, speaking }: { msg: ChatMessage; speaking: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`shrink-0 size-7 rounded-full flex items-center justify-center border ${
          isUser
            ? "bg-cyan-500/20 border-cyan-500/30"
            : "bg-white/5 border-white/10"
        }`}
      >
        {isUser ? (
          <User className="size-3.5 text-cyan-400" />
        ) : (
          <div
            className="size-2.5 rounded-full bg-cyan-400"
            style={{ boxShadow: "0 0 6px rgba(34,211,238,0.8)" }}
          />
        )}
      </div>

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-cyan-500/12 border border-cyan-500/25 text-slate-200 rounded-br-sm"
            : "bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-bl-sm"
        }`}
      >
        {msg.streaming && !msg.content ? (
          <StreamingDots />
        ) : (
          <span>{msg.content}</span>
        )}
        {msg.streaming && msg.content && (
          <motion.span
            className="inline-block w-0.5 h-[1em] bg-cyan-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.55, repeat: Infinity }}
          />
        )}
        {!isUser && !msg.streaming && speaking && <SoundWave />}
      </div>
    </motion.div>
  );
}

/* ── main ChatPage ───────────────────────────────────────────────────── */
export function ChatPage() {
  const { state, dispatch } = useAppState();
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [error, setError]             = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [orbState, setOrbState]       = useState<OrbState>("idle");

  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const jarvisTextRef = useRef("");

  const speech = useSpeech("de-DE");

  /* auth guard + conversation init */
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* sync orb with speech state */
  useEffect(() => {
    if (speech.isListening)      setOrbState("listening");
    else if (speech.isSpeaking)  setOrbState("speaking");
  }, [speech.isListening, speech.isSpeaking]);

  /* send */
  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || !state.conversationId || sending) return;

      setInput("");
      setError("");
      setActionState(null);
      setSending(true);
      setOrbState("thinking");
      jarvisTextRef.current = "";

      const userMsg: ChatMessage   = { id: crypto.randomUUID(), role: "user",   content: text };
      const jarvisMsg: ChatMessage = { id: crypto.randomUUID(), role: "jarvis", content: "", streaming: true };
      setMessages((prev) => [...prev, userMsg, jarvisMsg]);

      try {
        const result = await streamMessage(
          state.conversationId,
          text,
          (token) => {
            jarvisTextRef.current += token;
            setOrbState("speaking");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === jarvisMsg.id ? { ...m, content: m.content + token } : m,
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

        if (voiceEnabled && jarvisTextRef.current) {
          speech.speak(jarvisTextRef.current, () => setOrbState("idle"));
        } else {
          setOrbState("idle");
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === jarvisMsg.id
              ? { ...m, content: "⚠ Fehler: " + String(err), streaming: false }
              : m,
          ),
        );
        setOrbState("idle");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, state.conversationId, sending, voiceEnabled, speech],
  );

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

  const handleMic = () => {
    if (speech.isListening) {
      speech.stopListening();
      if (!sending) setOrbState("idle");
    } else {
      speech.startListening(
        (transcript) => {
          setInput(transcript);
          void send(transcript);
        },
        () => { if (!sending) setOrbState("idle"); },
      );
    }
  };

  const orbLabel = {
    idle: "Bereit", listening: "Hört zu…", thinking: "Denkt…", speaking: "Spricht…",
  }[orbState];

  const orbBadgeColor: "cyan" | "purple" | "orange" = {
    idle: "cyan", listening: "purple", thinking: "orange", speaking: "cyan",
  }[orbState] as "cyan" | "purple" | "orange";

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col pt-16 px-4 pb-4">
      <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col gap-3">

        {/* 3D orb card */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard intensity="light" hover="none" padding="none" className="overflow-hidden">
            <div className="relative h-[240px] sm:h-[300px] w-full">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="size-20 rounded-full border border-cyan-500/20 animate-pulse bg-cyan-500/5" />
                  </div>
                }
              >
                <ChatOrb orbState={orbState} className="w-full h-full" />
              </Suspense>

              {/* bloom */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="size-40 rounded-full blur-2xl"
                  animate={{
                    opacity: orbState === "idle" ? 0.15 : 0.3,
                    background: orbState === "listening"
                      ? "radial-gradient(circle, #818cf8 0%, transparent 70%)"
                      : orbState === "thinking"
                      ? "radial-gradient(circle, #f59e0b 0%, transparent 70%)"
                      : "radial-gradient(circle, #22d3ee 0%, transparent 70%)",
                  }}
                  transition={{ duration: 0.8 }}
                />
              </div>

              {/* state badge */}
              <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={orbState}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NeonBadge color={orbBadgeColor} pulse={orbState !== "idle"}>
                      {orbLabel}
                    </NeonBadge>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* info bar */}
            <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">JARVIS</span>
                <NeonBadge color="cyan" pulse className="text-[9px] px-1.5 py-0.5">Live</NeonBadge>
                <span className="text-xs text-slate-600 hidden sm:block">Shop OS · Groq llama-3.1-8b</span>
              </div>
              <button
                onClick={() => {
                  if (voiceEnabled) { speech.stopSpeaking(); setOrbState("idle"); }
                  setVoiceEnabled((v) => !v);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  voiceEnabled
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                    : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                {voiceEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                <span className="hidden sm:block">{voiceEnabled ? "Stimme an" : "Stumm"}</span>
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* messages */}
        <GlassCard
          intensity="light"
          hover="none"
          padding="none"
          className="flex-1 flex flex-col min-h-[200px] max-h-[calc(100vh-520px)] overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center justify-center h-full gap-3 py-6"
              >
                <p className="text-slate-600 text-sm">Wie kann ich dir helfen?</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Zeig meine Produkte", "Erstelle einen Rabatt", "Was läuft heute gut?"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="px-3 py-1.5 text-xs rounded-lg glass text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200"
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  speaking={speech.isSpeaking && msg.role === "jarvis" && !msg.streaming}
                />
              ))}
            </AnimatePresence>

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
                      <NeonBadge color="orange">
                        {actionState.actions.length} Aktion{actionState.actions.length !== 1 ? "en" : ""}
                      </NeonBadge>
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
                        <CheckCircle className="size-3.5" /> Bestätigen
                      </button>
                      <button
                        onClick={handleRollback}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 transition-all"
                      >
                        <XCircle className="size-3.5" /> Abbrechen
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* input bar */}
          <div className="border-t border-white/5 p-3">
            {error && (
              <div className="mb-2 px-3 py-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg border border-rose-500/20">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              {speech.supported && (
                <motion.button
                  onClick={handleMic}
                  disabled={sending}
                  whileTap={{ scale: 0.88 }}
                  className={`relative shrink-0 size-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                    speech.isListening
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                      : "bg-white/5 border-white/10 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30"
                  }`}
                >
                  {speech.isListening ? (
                    <MicOff className="size-4" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                  {speech.isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-purple-400/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.3, repeat: Infinity }}
                    />
                  )}
                </motion.button>
              )}

              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={speech.isListening ? "Hört zu…" : "Sprich mit JARVIS…"}
                disabled={sending || !state.conversationId || speech.isListening}
                className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:bg-cyan-500/5 transition-all duration-200 disabled:opacity-50"
              />

              <GradientButton
                gradient="cyan"
                size="md"
                className="px-4 shrink-0"
                onClick={() => void send()}
                disabled={sending || !input.trim() || !state.conversationId}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </GradientButton>
            </div>

            {/* listening waveform */}
            <AnimatePresence>
              {speech.isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center gap-[3px] justify-center overflow-hidden"
                >
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-purple-400"
                      animate={{ scaleY: [0.15, Math.random() * 0.85 + 0.15, 0.15] }}
                      transition={{
                        duration: 0.45 + Math.random() * 0.35,
                        repeat: Infinity,
                        delay: i * 0.035,
                        ease: "easeInOut",
                      }}
                      style={{ height: "20px", originY: 0.5 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
