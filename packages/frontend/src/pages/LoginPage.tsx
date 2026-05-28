import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
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
    } catch (err) {
      setError(String(err).replace("Error: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black px-8">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 55%, rgba(34,211,238,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Logo mark */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 text-center"
      >
        <div
          className="inline-flex items-center justify-center size-16 mb-5"
          style={{ filter: "drop-shadow(0 0 32px rgba(34,211,238,0.35))" }}
        >
          <svg viewBox="0 0 64 64" className="size-16">
            <circle
              cx="32" cy="32" r="29"
              stroke="#22d3ee" strokeWidth="1"
              fill="none" opacity="0.25"
            />
            <circle
              cx="32" cy="32" r="19"
              stroke="#22d3ee" strokeWidth="0.5"
              fill="none" opacity="0.12"
            />
            <text
              x="32" y="40"
              textAnchor="middle"
              fill="#22d3ee"
              fontSize="26"
              fontFamily="'Space Grotesk', system-ui, sans-serif"
              fontWeight="700"
            >
              J
            </text>
          </svg>
        </div>

        <h1
          className="text-[2.25rem] font-bold text-white tracking-tight leading-none"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          JARVIS
        </h1>
        <p className="text-[10px] text-white/25 mt-2.5 tracking-[0.35em] uppercase">
          Shop Operating System
        </p>
      </motion.div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] space-y-7"
      >
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-white/30 tracking-[0.2em] uppercase">
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="deine@email.de"
            className="w-full bg-transparent text-white text-sm placeholder:text-white/18 outline-none py-2.5 transition-colors duration-300"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.14)" }}
            onFocus={(e) =>
              (e.currentTarget.style.borderBottom =
                "1px solid rgba(34,211,238,0.5)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderBottom =
                "1px solid rgba(255,255,255,0.14)")
            }
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-white/30 tracking-[0.2em] uppercase">
            Passwort
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="••••••••"
            className="w-full bg-transparent text-white text-sm placeholder:text-white/18 outline-none py-2.5 transition-colors duration-300"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.14)" }}
            onFocus={(e) =>
              (e.currentTarget.style.borderBottom =
                "1px solid rgba(34,211,238,0.5)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderBottom =
                "1px solid rgba(255,255,255,0.14)")
            }
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-rose-400/80 text-xs leading-relaxed"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-sm font-medium text-cyan-400/80 hover:text-white disabled:opacity-40 transition-colors duration-300 tracking-wide"
          style={{ borderBottom: "1px solid rgba(34,211,238,0.25)" }}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin mx-auto" />
          ) : mode === "login" ? (
            "Einloggen"
          ) : (
            "Account erstellen"
          )}
        </button>

        {/* Mode toggle */}
        <p className="text-center text-white/20 text-xs">
          {mode === "login" ? "Noch kein Konto? " : "Schon dabei? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2"
          >
            {mode === "login" ? "Registrieren" : "Einloggen"}
          </button>
        </p>
      </motion.form>
    </div>
  );
}
