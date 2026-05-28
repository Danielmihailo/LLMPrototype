import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Zap, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";
import { api } from "@/lib/api";

export function LoginPage() {
  const { dispatch } = useAppState();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? api.login : api.register;
      const { user_id } = await fn(email, password);
      dispatch({ type: "SET_USER", payload: user_id });
      dispatch({ type: "NAVIGATE", payload: "chat" });
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Zap className="size-7 text-cyan-400" style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.7))" }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {mode === "login" ? "Willkommen zurück" : "Account erstellen"}
          </h1>
          <p className="text-slate-500 text-sm">JARVIS Shop Operating System</p>
        </div>

        <GlassCard intensity="medium" hover="none" padding="lg">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  mode === m
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m === "login" ? "Login" : "Registrieren"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="deine@email.de"
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-4 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-cyan-500/5 transition-all duration-200"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
              >
                {error}
              </motion.div>
            )}

            <GradientButton
              gradient="cyan"
              size="md"
              className="w-full mt-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "login" ? (
                "Einloggen"
              ) : (
                "Account erstellen"
              )}
            </GradientButton>
          </form>

          <div className="mt-4 text-center">
            <NeonBadge color="cyan" className="text-[9px]">256-bit verschlüsselt</NeonBadge>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
