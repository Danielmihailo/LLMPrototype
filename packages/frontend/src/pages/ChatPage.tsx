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

/* ── Error boundary ──────────────────────────────────────────────────── */
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
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            style={{ width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(34,211,238,0.18)" }}
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Orb fallback ────────────────────────────────────────────────────── */
function OrbFallback() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div
        style={{ width: 140, height: 140, borderRadius: "50%", border: "1px solid rgba(34,211,238,0.15)" }}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.97, 1.03, 0.97] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

const ChatOrb = lazy(() =>
  import("@/components/3d/ChatOrb").then((m) => ({ default: m.ChatOrb })),
);

/* ── Types ───────────────────────────────────────────────────────────── */
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

/* ── Streaming cursor ────────────────────────────────────────────────── */
function Cursor() {
  return (
    <motion.span
      className="inline-block w-[2px] h-[0.8em] bg-cyan-400/70 ml-[3px] align-middle rounded-sm"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity }}
    />
  );
}

/* ── Shop modal ──────────────────────────────────────────────────────── */
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    color: "rgba(255,255,255,0.88)",
    fontSize: "0.9rem",
    outline: "none",
    padding: "10px 0",
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.09)",
    caretColor: "rgba(34,211,238,0.9)",
    transition: "border-color 0.25s ease",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg px-6 pt-5 pb-12"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#050505",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "18px 18px 0 0",
        }}
      >
        {/* Drag handle */}
        <div className="w-8 h-[3px] rounded-full mx-auto mb-7" style={{ background: "rgba(255,255,255,0.14)" }} />

        <div className="flex items-center justify-between mb-8">
          <span
            className="hud"
            style={{ color: "rgba(34,211,238,0.65)", letterSpacing: "0.22em" }}
          >
            SHOP VERBINDEN
          </span>
          <button onClick={onClose} className="transition-colors p-1" style={{ color: "rgba(255,255,255,0.22)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}>
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!platform && (
            <motion.div key="picker" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-1">
              {([
                { id: "shopify"   as const, name: "Shopify",                 sub: "OAuth — sicher & in 30 Sekunden" },
                { id: "wordpress" as const, name: "WordPress / WooCommerce", sub: "Über Application Password" },
              ]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setError(""); }}
                  className="w-full flex items-center justify-between py-4 text-left px-2 rounded-lg transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div className="text-sm font-medium mb-0.5" style={{ color: "rgba(255,255,255,0.78)" }}>{p.name}</div>
                    <div className="hud" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em" }}>{p.sub}</div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 transition-colors" style={{ color: "rgba(255,255,255,0.18)" }} />
                </button>
              ))}
            </motion.div>
          )}

          {platform === "shopify" && (
            <motion.div key="shopify" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-7">
              <button onClick={() => { setPlatform(null); setError(""); }} className="hud transition-colors" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                ← Zurück
              </button>
              <div className="space-y-2">
                <label className="hud block" style={{ color: "rgba(255,255,255,0.28)" }}>Shop-Domain</label>
                <input
                  type="text" value={shopDomain} onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="meinshop.myshopify.com" autoFocus style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid rgba(34,211,238,0.55)")}
                  onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid rgba(255,255,255,0.09)")}
                />
              </div>
              {error && <p className="hud" style={{ color: "rgba(248,113,113,0.8)", letterSpacing: "0.04em" }}>{error}</p>}
              <button onClick={connectShopify} disabled={loading || !shopDomain.trim()} className="btn-jarvis">
                {loading ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : "Mit Shopify verbinden"}
              </button>
            </motion.div>
          )}

          {platform === "wordpress" && (
            <motion.div key="wordpress" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-6">
              <button onClick={() => { setPlatform(null); setError(""); }} className="hud transition-colors" style={{ color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                ← Zurück
              </button>
              {([
                { label: "Website URL",         val: wpUrl,  set: setWpUrl,  ph: "https://meinshop.de",       type: "url"      },
                { label: "Benutzername",         val: wpUser, set: setWpUser, ph: "admin",                      type: "text"     },
                { label: "Application Password", val: wpPass, set: setWpPass, ph: "xxxx xxxx xxxx xxxx",        type: "password" },
              ] as const).map((f) => (
                <div key={f.label} className="space-y-2">
                  <label className="hud block" style={{ color: "rgba(255,255,255,0.28)" }}>{f.label}</label>
                  <input
                    type={f.type} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.ph} style={inputStyle}
                    onFocus={(e) => (e.currentTarget.style.borderBottom = "1px solid rgba(34,211,238,0.55)")}
                    onBlur={(e) => (e.currentTarget.style.borderBottom = "1px solid rgba(255,255,255,0.09)")}
                  />
                </div>
              ))}
              {error && <p className="hud" style={{ color: "rgba(248,113,113,0.8)", letterSpacing: "0.04em" }}>{error}</p>}
              <button onClick={connectWordPress} disabled={loading || !wpUrl.trim() || !wpUser.trim() || !wpPass.trim()} className="btn-jarvis">
                {loading ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : "WordPress verbinden"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ── Main ChatPage ────────────────────────────────────────────────────── */
export function ChatPage() {
  const { state, dispatch } = useAppState();
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [error,       setError]       = useState("");
  const [orbState,    setOrbState]    = useState<OrbState>("idle");
  const [shopModal,   setShopModal]   = useState(false);

  const messagesRef   = useRef<HTMLDivElement>(null);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const jarvisTextRef = useRef("");
  const voiceInputRef = useRef(false);
  const convRef       = useRef(false);
  const listenAgainRef = useRef<() => void>(() => {});

  const speech = useSpeech("de-DE");

  /* State → color mapping for HUD dot */
  const stateColor = {
    idle:      "rgba(255,255,255,0.28)",
    listening: "rgba(167,139,250,1)",
    thinking:  "rgba(251,191,36,1)",
    speaking:  "rgba(34,211,238,1)",
  }[orbState];

  const orbLabel = { idle: "Bereit", listening: "Hört zu", thinking: "Denkt", speaking: "Spricht" }[orbState];

  /* Conversation init */
  useEffect(() => {
    if (!state.conversationId) {
      api.createConversation()
        .then(({ conversation_id }) => dispatch({ type: "SET_CONVERSATION", payload: conversation_id }))
        .catch(() => setError("Konnte Konversation nicht starten"));
    }
  }, [state.conversationId, dispatch]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Sync orb with speech */
  useEffect(() => {
    if (speech.isListening)      setOrbState("listening");
    else if (speech.isSpeaking)  setOrbState("speaking");
  }, [speech.isListening, speech.isSpeaking]);

  /* Send */
  const send = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || !state.conversationId || sending) return;

    setInput("");
    setError("");
    setActionState(null);
    setSending(true);
    setOrbState("thinking");
    jarvisTextRef.current = "";

    const userMsg:   ChatMessage = { id: crypto.randomUUID(), role: "user",   content: text };
    const jarvisMsg: ChatMessage = { id: crypto.randomUUID(), role: "jarvis", content: "", streaming: true };
    setMessages((prev) => [...prev, userMsg, jarvisMsg]);

    try {
      const result = await streamMessage(state.conversationId, text, (token) => {
        jarvisTextRef.current += token;
        setOrbState("speaking");
        setMessages((prev) =>
          prev.map((m) => m.id === jarvisMsg.id ? { ...m, content: m.content + token } : m),
        );
      });

      setMessages((prev) =>
        prev.map((m) => m.id === jarvisMsg.id ? { ...m, streaming: false } : m),
      );

      if (result.actions.length > 0) {
        setActionState({ actions: result.actions, actionId: result.action_id });
      }

      if (voiceInputRef.current && jarvisTextRef.current) {
        await speech.speak(jarvisTextRef.current, () => {
          setOrbState("idle");
          if (convRef.current) setTimeout(() => listenAgainRef.current(), 350);
        });
      } else {
        setOrbState("idle");
      }
      voiceInputRef.current = false;
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === jarvisMsg.id ? { ...m, content: "⚠ " + String(err), streaming: false } : m),
      );
      voiceInputRef.current = false;
      setOrbState("idle");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, state.conversationId, sending, speech]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const startOneRound = useCallback(() => {
    if (!convRef.current) return;
    speech.startListening(
      (transcript) => {
        if (!transcript.trim()) return;
        voiceInputRef.current = true;
        setInput(transcript);
        void send(transcript);
      },
      () => { if (convRef.current && !sending) setOrbState("idle"); },
    );
  }, [speech, send, sending]);

  listenAgainRef.current = startOneRound;

  const handleMic = () => {
    if (convRef.current || speech.isListening) {
      convRef.current = false;
      speech.stopListening();
      speech.stopSpeaking();
      setOrbState("idle");
    } else {
      convRef.current = true;
      startOneRound();
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "SET_CONVERSATION", payload: null });
  };

  const handleConfirm  = async () => { if (!actionState?.actionId) return; await api.confirmAction(actionState.actionId).catch(() => {}); setActionState(null); };
  const handleRollback = async () => { if (!actionState?.actionId) return; await api.rollbackAction(actionState.actionId).catch(() => {}); setActionState(null); };

  const suggestions = ["Zeig meine Produkte", "Erstelle einen Rabatt", "Was läuft heute gut?"];

  /* ── Render ──────────────────────────────────────────────────────────── */
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
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5"
        style={{
          height: "54px",
          borderBottom: "1px solid rgba(255,255,255,0.048)",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      >
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 transition-colors"
          style={{ color: "rgba(255,255,255,0.28)" }}
          title="Ausloggen"
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
        >
          <LogOut className="size-[15px]" />
        </button>

        {/* Center: brand + state */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: "0.62rem",
              fontWeight: 600,
              letterSpacing: "0.44em",
              textIndent: "0.44em",
              color: "rgba(255,255,255,0.62)",
            }}
          >
            JARVIS
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={orbState}
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
            >
              <span
                className="status-dot"
                style={{ background: stateColor, boxShadow: `0 0 8px ${stateColor}` }}
              />
              <span className="hud" style={{ color: stateColor }}>
                {orbLabel}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right placeholder */}
        <div className="size-7" />
      </div>

      {/* ── ACTION CONFIRM BAR ── */}
      <AnimatePresence>
        {actionState && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 flex justify-center px-5"
            style={{ top: "66px", left: 0, right: 0 }}
          >
            <div
              className="flex items-center gap-5 px-5 py-3"
              style={{
                background: "rgba(8,8,8,0.92)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
              }}
            >
              <span className="hud" style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
                {actionState.actions.length} Aktion{actionState.actions.length !== 1 ? "en" : ""} ausstehend
              </span>
              <div className="flex gap-4">
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1.5 hud transition-colors"
                  style={{ color: "rgba(52,211,153,0.8)", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(52,211,153,1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(52,211,153,0.8)")}
                >
                  <CheckCircle className="size-3.5" /> Bestätigen
                </button>
                <button
                  onClick={handleRollback}
                  className="flex items-center gap-1.5 hud transition-colors"
                  style={{ color: "rgba(248,113,113,0.75)", letterSpacing: "0.1em" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(248,113,113,1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(248,113,113,0.75)")}
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
        className="absolute left-0 right-0 z-10"
        style={{
          top: "54px",
          bottom: "86px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.38) 55%, transparent 100%)",
        }}
      >
        <div
          ref={messagesRef}
          className="h-full overflow-y-auto px-5 sm:px-8 pb-4 pt-10 flex flex-col gap-4 scrollbar-hide"
          style={{ maxWidth: "700px", margin: "0 auto" }}
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col items-center gap-6 mt-auto mb-6"
            >
              <p
                className="hud text-center"
                style={{ color: "rgba(255,255,255,0.18)", letterSpacing: "0.12em" }}
              >
                Wie kann ich helfen?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="hud px-4 py-2.5 transition-all duration-200"
                    style={{
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "3px",
                      color: "rgba(255,255,255,0.28)",
                      letterSpacing: "0.06em",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.68)";
                      e.currentTarget.style.borderColor = "rgba(34,211,238,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.28)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "jarvis" ? (
                  /* JARVIS message — left-border accent */
                  <div
                    className="max-w-[82%] pl-4 py-0.5"
                    style={{ borderLeft: "1.5px solid rgba(34,211,238,0.38)" }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
                      {msg.streaming && !msg.content ? (
                        <motion.span
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ color: "rgba(34,211,238,0.5)" }}
                        >
                          …
                        </motion.span>
                      ) : (
                        msg.content
                      )}
                      {msg.streaming && msg.content && <Cursor />}
                    </p>
                  </div>
                ) : (
                  /* User message — right-aligned, dim */
                  <p
                    className="text-sm leading-relaxed max-w-[72%] text-right"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {msg.content}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6"
        style={{
          paddingBottom: "22px",
          paddingTop: "8px",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 65%, transparent 100%)",
        }}
      >
        {/* Error notice */}
        {(error || speech.micError) && (
          <p
            className="hud text-center mb-3"
            style={{ color: "rgba(248,113,113,0.7)", letterSpacing: "0.06em" }}
          >
            {speech.micError === "permission-denied"
              ? "Mikrofon-Zugriff verweigert"
              : speech.micError === "not-supported"
              ? "Mikrofon nicht unterstützt"
              : speech.micError === "no-speech"
              ? "Keine Sprache erkannt"
              : speech.micError === "unknown"
              ? "Spracherkennungsfehler"
              : error}
          </p>
        )}

        {/* Waveform — above input, visible when listening */}
        <AnimatePresence>
          {speech.isListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-[2px] justify-center mb-3 max-w-2xl mx-auto overflow-hidden"
            >
              {Array.from({ length: 28 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{ background: "rgba(167,139,250,0.6)", height: "16px", originY: 0.5 }}
                  animate={{ scaleY: [0.06, Math.random() * 0.92 + 0.08, 0.06] }}
                  transition={{
                    duration: 0.35 + Math.random() * 0.25,
                    repeat: Infinity,
                    delay: i * 0.024,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input shell */}
        <div className="input-shell max-w-2xl mx-auto">
          {/* Mic */}
          {speech.supported && (
            <button
              onClick={handleMic}
              className="relative shrink-0 p-1.5 transition-colors"
              style={{
                color: speech.micError === "permission-denied"
                  ? "rgba(248,113,113,0.7)"
                  : (speech.isListening || speech.isSpeaking || convRef.current)
                  ? "rgba(167,139,250,1)"
                  : "rgba(255,255,255,0.28)",
              }}
              title={convRef.current ? "Gespräch beenden" : "Gespräch starten"}
            >
              <Mic className="size-[17px]" />
              {(speech.isListening || convRef.current) && !speech.micError && (
                <motion.span
                  className="absolute top-1 right-1 size-1.5 rounded-full bg-rose-500"
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </button>
          )}

          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              speech.isListening ? "Hört zu …"
              : convRef.current   ? "JARVIS hört zu …"
              : "Sprich mit JARVIS …"
            }
            disabled={sending || !state.conversationId || speech.isListening}
            autoComplete="off"
            style={{
              flex: 1,
              background: "transparent",
              color: "rgba(255,255,255,0.88)",
              fontSize: "0.875rem",
              outline: "none",
              padding: "8px 0",
              border: "none",
              caretColor: "rgba(34,211,238,0.9)",
              fontFamily: "'Inter', system-ui, sans-serif",
              opacity: (sending || !state.conversationId || speech.isListening) ? 0.4 : 1,
            }}
            className="placeholder:text-white/20"
          />

          {/* Shop */}
          <button
            onClick={() => setShopModal(true)}
            title="Shop verbinden"
            className="shrink-0 p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.22)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
          >
            <Store className="size-[15px]" />
          </button>

          {/* Send */}
          <button
            onClick={() => void send()}
            disabled={sending || !input.trim() || !state.conversationId}
            className="shrink-0 p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.28)" }}
            onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.color = "rgba(34,211,238,0.85)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            {sending ? (
              <Loader2 className="size-[15px] animate-spin" />
            ) : (
              <Send className="size-[15px]" />
            )}
          </button>
        </div>
      </div>

      {/* ── SHOP MODAL ── */}
      <AnimatePresence>
        {shopModal && <ShopModal onClose={() => setShopModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
