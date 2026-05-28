import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Brain, ShieldCheck, Gauge } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";

const JarvisOrb = lazy(() =>
  import("@/components/3d/JarvisOrb").then((m) => ({ default: m.JarvisOrb })),
);

const features = [
  {
    icon: Brain,
    title: "KI-gesteuert",
    desc: "Llama 3.1 versteht deine Anfragen in natürlicher Sprache und führt komplexe Shop-Aktionen aus.",
    badge: "LLM",
    color: "purple" as const,
  },
  {
    icon: Zap,
    title: "Echtzeit-Stream",
    desc: "Groq-Inference liefert Antworten in Millisekunden. Jedes Token erscheint live.",
    badge: "Realtime",
    color: "cyan" as const,
  },
  {
    icon: ShieldCheck,
    title: "Sicher",
    desc: "Jede Aktion wird vor Ausführung bestätigt. Du behältst immer die Kontrolle.",
    badge: "Safe",
    color: "green" as const,
  },
  {
    icon: Gauge,
    title: "Vollständig",
    desc: "Produkte, Preise, Inhalte, Inventar — JARVIS verwaltet deinen gesamten Shop.",
    badge: "Full",
    color: "orange" as const,
  },
];

export function HomePage() {
  const { dispatch } = useAppState();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Hero: two-column layout ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-0 items-center pt-24 pb-16">
        {/* Left – text */}
        <motion.div
          className="flex flex-col gap-6 z-10"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          {/* status badges */}
          <motion.div
            className="flex items-center gap-2 flex-wrap"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <NeonBadge color="cyan" pulse>Online</NeonBadge>
            <NeonBadge color="green">Groq · llama-3.1-8b</NeonBadge>
          </motion.div>

          {/* title */}
          <motion.h1
            className="text-7xl sm:text-8xl font-black tracking-tight leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="text-white" style={{ textShadow: "0 0 60px rgba(255,255,255,0.08)" }}>
              JAR
            </span>
            <span
              className="text-cyan-400"
              style={{ textShadow: "0 0 40px rgba(34,211,238,0.7), 0 0 100px rgba(34,211,238,0.3)" }}
            >
              VIS
            </span>
          </motion.h1>

          {/* tagline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-2xl sm:text-3xl text-slate-300 font-light mb-2">
              Steuere deinen Shop
            </p>
            <p className="text-2xl sm:text-3xl text-cyan-400 font-semibold">
              per Sprache.
            </p>
            <p className="mt-3 text-sm text-slate-600 italic">
              wie Tony Stark mit seinem Anzug
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 mt-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <GradientButton
              gradient="cyan"
              size="lg"
              className="group"
              onClick={() => dispatch({ type: "NAVIGATE", payload: "chat" })}
            >
              Mit JARVIS sprechen
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </GradientButton>
            <button
              onClick={() => dispatch({ type: "NAVIGATE", payload: "login" })}
              className="px-8 h-12 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/25 transition-all duration-200"
            >
              Einloggen
            </button>
          </motion.div>

          {/* mini stats */}
          <motion.div
            className="flex gap-6 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {[
              { label: "Latenz", value: "~200ms" },
              { label: "Model", value: "8B params" },
              { label: "Plattformen", value: "3+" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-600 uppercase tracking-widest">{label}</p>
                <p className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right – 3D orb */}
        <motion.div
          className="relative h-[420px] lg:h-[700px] w-full"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 1.2, ease: "easeOut" }}
        >
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <div className="size-32 rounded-full border border-cyan-500/20 animate-pulse bg-cyan-500/5" />
              </div>
            }
          >
            <JarvisOrb className="w-full h-full" />
          </Suspense>

          {/* glow bloom behind orb */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="size-64 rounded-full opacity-20 blur-3xl"
              style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Feature cards ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.7 }}
        >
          {features.map(({ icon: Icon, title, desc, badge, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.08 }}
              whileHover={{ y: -4, scale: 1.02 }}
              style={{ perspective: 800 }}
            >
              <GlassCard intensity="light" hover="glow" padding="md" className="h-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <Icon className="size-5 text-cyan-400" />
                    </div>
                    <NeonBadge color={color} className="text-[9px] px-2 py-0.5">
                      {badge}
                    </NeonBadge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* bottom fade */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
