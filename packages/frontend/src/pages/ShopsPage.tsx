import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Plus, ShoppingBag, Globe, Zap,
  X, ExternalLink, CheckCircle, Loader2, Lock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";
import { api, type Shop } from "@/lib/api";

/* ── platform config ──────────────────────────────────────────────── */
const PLATFORM_META = {
  shopify: {
    label: "Shopify",
    icon: ShoppingBag,
    color: "green" as const,
    desc: "Via OAuth — kein Password wird gespeichert.",
  },
  wordpress: {
    label: "WordPress / WooCommerce",
    icon: Globe,
    color: "blue" as const,
    desc: "Via Application Password aus dem WP-Profil.",
  },
  greenfield: {
    label: "Greenfield",
    icon: Zap,
    color: "cyan" as const,
    desc: "Eigenständige JARVIS-Shop-Infrastruktur.",
  },
} as const;

type Platform = keyof typeof PLATFORM_META;

/* ── connect modal ────────────────────────────────────────────────── */
function ConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [step, setStep]         = useState<"pick" | "shopify" | "wordpress">("pick");
  const [shopDomain, setShopDomain] = useState("");
  const [wpUrl, setWpUrl]       = useState("");
  const [wpUser, setWpUser]     = useState("");
  const [wpPass, setWpPass]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleShopifyConnect = async () => {
    const raw = shopDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!raw) { setError("Bitte Shop-Domain eingeben"); return; }
    const domain = raw.includes(".myshopify.com") ? raw : `${raw}.myshopify.com`;
    setLoading(true);
    setError("");
    try {
      const { oauth_url } = await api.getShopifyOAuthUrl(domain);
      window.location.href = oauth_url;
    } catch {
      setError("OAuth konnte nicht gestartet werden. API erreichbar?");
      setLoading(false);
    }
  };

  const handleWordPressConnect = async () => {
    if (!wpUrl || !wpUser || !wpPass) { setError("Alle Felder ausfüllen"); return; }
    setLoading(true);
    setError("");
    try {
      await api.connectWordPress(wpUrl, wpUser, wpPass);
      onConnected();
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(12px)", background: "rgba(3,7,18,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md"
      >
        <GlassCard intensity="heavy" hover="none" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {step === "pick" ? "Shop verbinden" : step === "shopify" ? "Shopify verbinden" : "WordPress verbinden"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === "pick" ? "Wähle deine Plattform" : "Details eingeben"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="size-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === "pick" && (
              <motion.div
                key="pick"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {(["shopify", "wordpress"] as const).map((platform) => {
                  const meta = PLATFORM_META[platform];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={platform}
                      onClick={() => setStep(platform)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all duration-200 text-left group"
                    >
                      <div className="shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:border-cyan-500/20">
                        <Icon className="size-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{meta.label}</span>
                          <NeonBadge color={meta.color} className="text-[9px] px-1.5 py-0.5">
                            {platform === "shopify" ? "OAuth" : "API Key"}
                          </NeonBadge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
                      </div>
                      <ExternalLink className="size-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </motion.div>
            )}

            {step === "shopify" && (
              <motion.div
                key="shopify"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 leading-relaxed">
                  Du wirst zu Shopify weitergeleitet — dort genehmigst du den Zugriff. Kein Password wird in JARVIS gespeichert.
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Shop-Domain</label>
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="meinshop.myshopify.com"
                    autoFocus
                    className="w-full h-10 px-4 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && void handleShopifyConnect()}
                  />
                  <p className="mt-1.5 text-xs text-slate-600">Nur die .myshopify.com Domain</p>
                </div>
                {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setStep("pick"); setError(""); }} className="flex-1 h-10 rounded-lg text-sm text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">Zurück</button>
                  <GradientButton gradient="green" size="md" className="flex-1" onClick={() => void handleShopifyConnect()} disabled={loading || !shopDomain.trim()}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <><ExternalLink className="size-4" />Zu Shopify</>}
                  </GradientButton>
                </div>
              </motion.div>
            )}

            {step === "wordpress" && (
              <motion.div
                key="wordpress"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 leading-relaxed">
                  WordPress → Benutzer → Profil → Application Passwords → neues Password erstellen.
                </div>
                {[
                  { label: "Shop URL", value: wpUrl, set: setWpUrl, placeholder: "https://meinshop.de", type: "url", icon: null },
                  { label: "Benutzername", value: wpUser, set: setWpUser, placeholder: "admin", type: "text", icon: null },
                  { label: "Application Password", value: wpPass, set: setWpPass, placeholder: "xxxx xxxx xxxx xxxx", type: "password", icon: Lock },
                ].map(({ label, value, set, placeholder, type, icon: Icon }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                    <div className="relative">
                      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-600" />}
                      <input type={type} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                        className={`w-full h-10 ${Icon ? "pl-9" : "pl-4"} pr-4 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all`} />
                    </div>
                  </div>
                ))}
                {error && <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setStep("pick"); setError(""); }} className="flex-1 h-10 rounded-lg text-sm text-slate-400 border border-white/10 hover:border-white/20 hover:text-white transition-all">Zurück</button>
                  <GradientButton gradient="blue" size="md" className="flex-1" onClick={() => void handleWordPressConnect()} disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Verbinden"}
                  </GradientButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

/* ── main ShopsPage ───────────────────────────────────────────────── */
export function ShopsPage() {
  const { state, dispatch }     = useAppState();
  const [shops, setShops]       = useState<Shop[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [justConnected, setJustConnected] = useState(false);

  const loadShops = () => {
    setLoading(true);
    api.listShops().then(({ shops }) => setShops(shops)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!state.userId) { dispatch({ type: "NAVIGATE", payload: "login" }); return; }
    loadShops();
    // Shopify OAuth callback redirects here with ?connected=<shop_id>
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      setJustConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setJustConnected(false), 6000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.userId]);

  return (
    <>
      <AnimatePresence>
        {showModal && (
          <ConnectModal
            onClose={() => setShowModal(false)}
            onConnected={() => { setShowModal(false); loadShops(); }}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen px-4 pt-24 pb-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Meine Shops</h1>
              <p className="text-sm text-slate-500">Verbinde JARVIS mit deinen Online-Shops</p>
            </div>
            <GradientButton gradient="cyan" size="sm" className="gap-1.5" onClick={() => setShowModal(true)}>
              <Plus className="size-3.5" /> Shop verbinden
            </GradientButton>
          </motion.div>

          <AnimatePresence>
            {justConnected && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm"
              >
                <CheckCircle className="size-5 shrink-0" />
                Shop erfolgreich verbunden! JARVIS hat jetzt Zugriff.
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} intensity="light" hover="none" padding="md" className="animate-pulse">
                  <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </GlassCard>
              ))}
            </div>
          ) : shops.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Store className="size-8 text-slate-600" />
              </div>
              <p className="text-slate-500 text-sm">Noch kein Shop verbunden</p>
              <GradientButton gradient="cyan" size="md" onClick={() => setShowModal(true)}>
                <Plus className="size-4" /> Ersten Shop verbinden
              </GradientButton>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((shop, i) => {
                const meta = PLATFORM_META[shop.platform as Platform] ?? PLATFORM_META.greenfield;
                const Icon = meta.icon;
                return (
                  <motion.div key={shop.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <GlassCard intensity="medium" hover="glow" padding="md">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                          <Icon className="size-5 text-cyan-400" />
                        </div>
                        <NeonBadge color={meta.color} className="text-[9px]">{meta.label}</NeonBadge>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{shop.name}</h3>
                      {shop.domain && <p className="text-xs text-slate-600 font-mono truncate">{shop.domain}</p>}
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={() => { dispatch({ type: "SET_SHOP_CONNECTION", payload: shop.id }); dispatch({ type: "NAVIGATE", payload: "chat" }); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Mit JARVIS steuern →
                        </button>
                        <NeonBadge color="green" className="text-[9px]">Aktiv</NeonBadge>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
