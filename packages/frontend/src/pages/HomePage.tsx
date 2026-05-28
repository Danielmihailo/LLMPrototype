import { motion } from "framer-motion";
import { ArrowRight, Zap, Brain, ShieldCheck, Gauge } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";

const features = [
  {
    icon: Brain,
    title: "KI-gesteuert",
    desc: "Llama 3.1 versteht deine Anfragen in natürlicher Sprache und führt komplexe Shop-Aktionen aus.",
    badge: "LLM" as const,
    color: "purple" as const,
  },
  {
    icon: Zap,
    title: "Blitzschnell",
    desc: "Groq-Inference liefert Antworten in Echtzeit. Streaming-Tokens, keine Wartezeit.",
    badge: "Realtime" as const,
    color: "cyan" as const,
  },
  {
    icon: ShieldCheck,
    title: "Sicher",
    desc: "Jede Aktion wird vor Ausführung bestätigt. Du behältst immer die Kontrolle.",
    badge: "Safe" as const,
    color: "green" as const,
  },
  {
    icon: Gauge,
    title: "Vollständig",
    desc: "Produkte, Preise, Inhalte, Inventar — JARVIS verwaltet deinen gesamten Shop.",
    badge: "Full" as const,
    color: "orange" as const,
  },
];

export function HomePage() {
  const { dispatch } = useAppState();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16">
      {/* Hero */}
      <motion.div
        className="text-center max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <NeonBadge color="cyan" pulse>Online</NeonBadge>
          <NeonBadge color="green">Groq · llama-3.1-8b</NeonBadge>
        </motion.div>

        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <span
            className="text-white"
            style={{ textShadow: "0 0 60px rgba(255,255,255,0.1)" }}
          >
            JAR
          </span>
          <span
            className="text-cyan-400"
            style={{
              textShadow:
                "0 0 30px rgba(34,211,238,0.6), 0 0 80px rgba(34,211,238,0.3)",
            }}
          >
            VIS
          </span>
        </motion.h1>

        <motion.p
          className="text-xl sm:text-2xl text-slate-400 mb-4 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Steuere deinen Online-Shop per Sprache
        </motion.p>
        <motion.p
          className="text-sm text-slate-600 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          wie Tony Stark mit seinem Anzug
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
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
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </GradientButton>
          <button
            onClick={() => dispatch({ type: "NAVIGATE", payload: "login" })}
            className="px-8 h-12 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all duration-200"
          >
            Einloggen
          </button>
        </motion.div>
      </motion.div>

      {/* Features */}
      <motion.div
        className="w-full max-w-5xl mx-auto mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
      >
        {features.map(({ icon: Icon, title, desc, badge, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 + i * 0.1 }}
          >
            <GlassCard intensity="light" hover="glow" padding="md" className="h-full">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-white/5">
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

      {/* Bottom fade */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
    </div>
  );
}
