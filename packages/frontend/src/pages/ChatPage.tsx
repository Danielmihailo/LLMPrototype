import {
  useState,
  useEffect,
  useRef,
  Suspense,
  lazy,
  useCallback,
  Component,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Store,
  X,
  ChevronRight,
  LogOut,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAppState } from "@/store/state";
import { api, streamMessage, type Action } from "@/lib/api";
import { useSpeech } from "@/hooks/useSpeech";
import type { OrbState } from "@/components/3d/ChatOrb";

/* ── Error boundary for Three.js canvas failures ────────────────────── */
class OrbErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      // Fallback: simple pulsing ring, no 3D
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 160, height: 160, borderRadius: "50%",
            border: "1px solid rgba(34,211,238,0.25)",
            animation: "pulse 3s ease-in-out infinite",
            boxShadow: "0 0 60px rgba(34,211,238,0.08)",
          }} />
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Orb fallback (while lazy-loading Three.js) ─────────────────────── */
function OrbFallback() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div
        style={{
          width: 120, height: 120, borderRadius: "50%",
          border: "1px solid rgba(34,211,238,0.2)",
        }}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

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

/* ── streaming cursor ────────────────────────────────────────────────── */
function Cursor() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[0.85em] bg-cyan-400/80 ml-[2px] align-middle rounded-sm"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.55, repeat: Infinity }}
    />
  );
}

/* ── shop connect bottom sheet ──────────────────────────────────────── */
function ShopModal({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<"shopify" | "wordpress" | null>(null);
  const [shopDomain, setShopDomain] = useState("");
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const connectShopify = async () => {
    const raw = shopDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const domain = raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;
    setLoading(true);
    try {
      const { oauth_url } = await api.getShopifyOAuthUrl(domain);
      window.location.href = oauth_url;
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  const connectWordPress = async () => {
    setLoading(true);
    try {
      await api.connectWordPress(wpUrl.trim(), wpUser.trim(), wpPass.trim());
      onClose();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  const lineStyle = { borderBottom: "1px solid rgba(255,255,255,0.09)" };
  const inputClass =
    "w-full bg-transparent text-white text-sm placeholder:text-white/20 outline-none py-2.5 transition-colors duration-200";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-[#050505] px-6 pt-5 pb-10"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px 20px 0 0" }}
      >
        {/* drag handle */}
        <div className="w-9 h-[3px] bg-white/15 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-7">
          <h2
            className="text-white/80 font-semibold text-sm tracking-wide"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Shop verbinden
          </h2>
          <button
            onClick={onClose}
            className="text-white/25 hover:text-white/60 transition-colors p-1"
          >
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!platform && (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-1"
            >
              {(
                [
                  { id: "shopify" as const, name: "Shopify", sub: "OAuth — sicher & in 30 Sekunden" },
                  { id: "wordpress" as const, name: "WordPress / WooCommerce", sub: "Über Application Password" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setError(""); }}
                  className="w-full flex items-center justify-between py-4 text-left group transition-colors hover:bg-white/[0.025] px-1 rounded-lg"
                >
                  <div>
                    <div className="text-white/75 text-sm font-medium">{p.name}</div>
                    <div className="text-white/30 text-xs mt-0.5">{p.sub}</div>
                  </div>
                  <ChevronRight className="size-4 text-white/20 group-hover:text-cyan-400/60 transition-colors" />
                </button>
              ))}
            </motion.div>
          )}

          {platform === "shopify" && (
            <motion.div
              key="shopify"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <button
                onClick={() => { setPlatform(null); setError(""); }}
                className="text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                ← Zurück
              </button>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 tracking-[0.2em] uppercase">
                  Shop-Domain
                </label>
                <input
                  type="text"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="meinshop.myshopify.com"
                  autoFocus
                  className={inputClass}
                  style={lineStyle}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderBottom = "1px solid rgba(34,211,238,0.45)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderBottom = "1px solid rgba(255,255,255,0.09)")
                  }
                />
              </div>
              {error && <p className="text-rose-400/70 text-xs">{error}</p>}
              <button
                onClick={connectShopify}
                disabled={loading || !shopDomain.trim()}
                className="w-full py-3 text-sm text-cyan-400/80 hover:text-white disabled:opacity-30 transition-colors"
                style={{ borderBottom: "1px solid rgba(34,211,238,0.22)" }}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin mx-auto" />
                ) : (
                  "Mit Shopify verbinden →"
                )}
              </button>
            </motion.div>
          )}

          {platform === "wordpress" && (
            <motion.div
              key="wordpress"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-5"
            >
              <button
                onClick={() => { setPlatform(null); setError(""); }}
                className="text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                ← Zurück
              </button>
              {(
                [
                  { label: "Website URL", val: wpUrl, set: setWpUrl, ph: "https://meinshop.de", type: "url" },
                  { label: "Benutzername", val: wpUser, set: setWpUser, ph: "admin", type: "text" },
                  { label: "Application Password", val: wpPass, set: setWpPass, ph: "xxxx xxxx xxxx xxxx", type: "password" },
                ] as const
              ).map((f) => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-[10px] text-white/30 tracking-[0.2em] uppercase">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className={inputClass}
                    style={lineStyle}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderBottom = "1px solid rgba(34,211,238,0.45)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderBottom = "1px solid rgba(255,255,255,0.09)")
                    }
                  />
                </div>
              ))}
              {error && <p className="text-rose-400/70 text-xs">{error}</p>}
              <button
                onClick={connectWordPress}
                disabled={loading || !wpUrl.trim() || !wpUser.trim() || !wpPass.trim()}
                className="w-full py-3 text-sm text-cyan-400/80 hover:text-white disabled:opacity-30 transition-colors"
                style={{ borderBottom: "1px solid rgba(34,211,238,0.22)" }}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin mx-auto" />
                ) : (
                  "WordPress verbinden →"
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ── main ChatPage ───────────────────────────────────────────────────── */
export function ChatPage() {
  const { state, dispatch } = useAppState();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [shopModal, setShopModal] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const jarvisTextRef = useRef("");

  const speech = useSpeech("de-DE");

  /* conversation init */
  useEffect(() => {
    if (!state.conversationId) {
      api
        .createConversation()
        .then(({ conversation_id }) =>
          dispatch({ type: "SET_CONVERSATION", payload: conversation_id }),
        )
        .catch(() => setError("Konnte Konversation nicht starten"));
    }
  }, [state.conversationId, dispatch]);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* sync orb with speech */
  useEffect(() => {
    if (speech.isListening) setOrbState("listening");
    else if (speech.isSpeaking) setOrbState("speaking");
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

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const jarvisMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "jarvis",
        content: "",
        streaming: true,
      };
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
                m.id === jarvisMsg.id
                  ? { ...m, content: m.content + token }
                  : m,
              ),
            );
          },
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === jarvisMsg.id ? { ...m, streaming: false } : m,
          ),
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
              ? { ...m, content: "⚠ " + String(err), streaming: false }
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

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "SET_CONVERSATION", payload: null });
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

  const orbLabel = {
    idle: "Bereit",
    listening: "Hört zu …",
    thinking: "Denkt …",
    speaking: "Spricht …",
  }[orbState];

  const suggestions = ["Zeig meine Produkte", "Erstelle einen Rabatt", "Was läuft heute gut?"];

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>

      {/* ── FULL-SCREEN ORB ── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <OrbErrorBoundary>
          <Suspense fallback={<OrbFallback />}>
            <ChatOrb orbState={orbState} className="w-full h-full" />
          </Suspense>
        </OrbErrorBoundary>
      </div>

      {/* ── TOP BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-5 pt-6 pointer-events-none">
        {/* logout */}
        <button
          onClick={handleLogout}
          className="pointer-events-auto text-white/15 hover:text-white/45 transition-colors p-1.5"
          title="Ausloggen"
        >
          <LogOut className="size-4" />
        </button>

        {/* center wordmark + state */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-medium"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            JARVIS
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={orbState}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] text-cyan-400/55 tracking-wide"
            >
              {orbLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* voice toggle */}
        <button
          onClick={() => {
            if (voiceEnabled) { speech.stopSpeaking(); setOrbState("idle"); }
            setVoiceEnabled((v) => !v);
          }}
          className="pointer-events-auto transition-colors p-1.5"
          style={{ color: voiceEnabled ? "rgba(34,211,238,0.55)" : "rgba(255,255,255,0.15)" }}
          title={voiceEnabled ? "Stimme deaktivieren" : "Stimme aktivieren"}
        >
          {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
      </div>

      {/* ── ACTION CONFIRM BAR ── */}
      <AnimatePresence>
        {actionState && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-20 left-0 right-0 z-10 flex justify-center px-5"
          >
            <div
              className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(10,10,10,0.85)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span className="text-white/50 text-xs">
                {actionState.actions.length} Aktion{actionState.actions.length !== 1 ? "en" : ""} ausstehend
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors"
                >
                  <CheckCircle className="size-3.5" /> Bestätigen
                </button>
                <button
                  onClick={handleRollback}
                  className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-300 transition-colors"
                >
                  <XCircle className="size-3.5" /> Abbrechen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES OVERLAY ── */}
      <div
        className="absolute bottom-[72px] left-0 right-0 z-10"
        style={{
          height: "45vh",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)",
        }}
      >
        <div
          ref={messagesRef}
          className="h-full overflow-y-auto px-5 sm:px-8 pb-3 pt-8 flex flex-col gap-2.5 scrollbar-hide"
          style={{ maxWidth: "680px", margin: "0 auto" }}
        >
          {/* empty state suggestions */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center gap-4 mt-auto mb-4"
            >
              <p className="text-white/18 text-sm text-center">Wie kann ich helfen?</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="px-3.5 py-1.5 text-xs text-white/30 hover:text-white/60 rounded-full transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* message list */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex ${
                  msg.role === "user"
                    ? "justify-end"
                    : "justify-start items-start gap-2"
                }`}
              >
                {msg.role === "jarvis" && (
                  <div
                    className="size-[6px] rounded-full bg-cyan-400/60 shrink-0 mt-[8px]"
                    style={{ boxShadow: "0 0 6px rgba(34,211,238,0.4)" }}
                  />
                )}
                <p
                  className={`text-sm leading-relaxed max-w-[76%] ${
                    msg.role === "user"
                      ? "text-white/60 text-right"
                      : "text-cyan-50/75"
                  }`}
                >
                  {msg.streaming && !msg.content ? (
                    <motion.span
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="text-cyan-400/50"
                    >
                      …
                    </motion.span>
                  ) : (
                    msg.content
                  )}
                  {msg.streaming && msg.content && <Cursor />}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 pb-5 pt-2"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
        }}
      >
        {error && (
          <p className="text-rose-400/60 text-xs text-center mb-2">{error}</p>
        )}

        <div
          className="flex items-center gap-2 max-w-2xl mx-auto"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.11)" }}
        >
          {/* Mic */}
          {speech.supported && (
            <button
              onClick={handleMic}
              disabled={sending}
              className={`shrink-0 p-2 transition-colors ${
                speech.isListening
                  ? "text-purple-400/90"
                  : "text-white/25 hover:text-white/55"
              }`}
            >
              {speech.isListening ? (
                <MicOff className="size-[18px]" />
              ) : (
                <Mic className="size-[18px]" />
              )}
            </button>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={speech.isListening ? "Hört zu …" : "Sprich mit JARVIS …"}
            disabled={sending || !state.conversationId || speech.isListening}
            autoComplete="off"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/22 outline-none py-3 disabled:opacity-40"
          />

          {/* Shop button */}
          <button
            onClick={() => setShopModal(true)}
            title="Shop verbinden"
            className="shrink-0 p-2 text-white/22 hover:text-white/55 transition-colors"
          >
            <Store className="size-4" />
          </button>

          {/* Send */}
          <button
            onClick={() => void send()}
            disabled={sending || !input.trim() || !state.conversationId}
            className="shrink-0 p-2 text-white/30 hover:text-cyan-400/80 disabled:opacity-20 transition-colors"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>

        {/* Listening waveform */}
        <AnimatePresence>
          {speech.isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex items-center gap-[2px] justify-center overflow-hidden"
            >
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full bg-purple-400/50"
                  animate={{
                    scaleY: [0.08, Math.random() * 0.9 + 0.1, 0.08],
                  }}
                  transition={{
                    duration: 0.38 + Math.random() * 0.28,
                    repeat: Infinity,
                    delay: i * 0.022,
                    ease: "easeInOut",
                  }}
                  style={{ height: "14px", originY: 0.5 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── SHOP MODAL ── */}
      <AnimatePresence>
        {shopModal && <ShopModal onClose={() => setShopModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
