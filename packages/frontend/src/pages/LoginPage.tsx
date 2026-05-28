import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAppState } from "@/store/state";
import { api } from "@/lib/api";

export function LoginPage() {
  const { dispatch } = useAppState();
  const [mode, setMode]         = useState<"login" | "register">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
    <div
      className="w-full h-full flex flex-col items-center justify-center px-8 relative overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* ── Dot grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(34,211,238,0.07) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 65% at 50% 50%, black 20%, transparent 100%)",
        }}
      />

      {/* ── Ambient radial ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 52% 32% at 50% 50%, rgba(34,211,238,0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── Logo mark ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14 flex flex-col items-center"
      >
        {/* SVG mark */}
        <div
          className="mb-8"
          style={{ filter: "drop-shadow(0 0 48px rgba(34,211,238,0.28))" }}
        >
          <svg
            viewBox="0 0 96 96"
            width="108"
            height="108"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outermost static ring */}
            <circle
              cx="48" cy="48" r="45"
              stroke="rgba(34,211,238,0.09)"
              strokeWidth="0.5"
            />
            {/* Slow-spinning dashed ring */}
            <circle
              cx="48" cy="48" r="38"
              stroke="rgba(34,211,238,0.18)"
              strokeWidth="0.6"
              strokeDasharray="5 11"
              className="logo-ring-spin"
            />
            {/* Counter-spinning dotted ring */}
            <circle
              cx="48" cy="48" r="30"
              stroke="rgba(34,211,238,0.12)"
              strokeWidth="0.5"
              strokeDasharray="2 14"
              className="logo-ring-spin-rev"
            />
            {/* Solid inner ring */}
            <circle
              cx="48" cy="48" r="22"
              stroke="rgba(34,211,238,0.32)"
              strokeWidth="0.75"
            />
            {/* 4 tick marks at 90° intervals */}
            <line x1="48" y1="4"  x2="48" y2="10" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
            <line x1="92" y1="48" x2="86" y2="48" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
            <line x1="48" y1="92" x2="48" y2="86" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
            <line x1="4"  y1="48" x2="10" y2="48" stroke="rgba(34,211,238,0.3)" strokeWidth="0.8" />
            {/* Core glow dot */}
            <circle cx="48" cy="48" r="3" fill="rgba(34,211,238,0.5)" />
            {/* J glyph */}
            <text
              x="48" y="56"
              textAnchor="middle"
              fill="rgba(34,211,238,0.92)"
              fontSize="22"
              fontFamily="'Space Grotesk', system-ui, sans-serif"
              fontWeight="700"
            >
              J
            </text>
          </svg>
        </div>

        {/* Wordmark */}
        <h1
          className="text-white/95 font-bold leading-none mb-3"
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: "2.6rem",
            letterSpacing: "0.45em",
            textIndent: "0.45em", /* compensate tracking so it looks centered */
          }}
        >
          JARVIS
        </h1>

        {/* Tagline */}
        <p
          className="hud"
          style={{ color: "rgba(34,211,238,0.48)", letterSpacing: "0.3em" }}
        >
          AGENTIC · COMMERCE · INTELLIGENCE
        </p>
      </motion.div>

      {/* ── Separator ── */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] mb-11"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          transformOrigin: "center",
        }}
      />

      {/* ── Form ── */}
      <motion.form
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] space-y-9"
      >
        {/* Email */}
        <div className="space-y-2">
          <label
            className="hud block"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            E-Mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="deine@email.de"
            className="login-input"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label
            className="hud block"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
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
            className="login-input"
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="hud leading-relaxed"
              style={{ color: "rgba(248,113,113,0.8)", letterSpacing: "0.04em" }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <div className="pt-2">
          <button type="submit" disabled={loading} className="btn-jarvis">
            {loading ? (
              <Loader2 className="size-3.5 animate-spin mx-auto" />
            ) : mode === "login" ? (
              "Einloggen"
            ) : (
              "Account erstellen"
            )}
          </button>
        </div>

        {/* Mode toggle */}
        <p
          className="text-center hud"
          style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em" }}
        >
          {mode === "login" ? "Noch kein Konto?" : "Schon dabei?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="transition-colors duration-200 underline underline-offset-2"
            style={{ color: "rgba(255,255,255,0.38)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(34,211,238,0.7)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.38)")
            }
          >
            {mode === "login" ? "Registrieren" : "Einloggen"}
          </button>
        </p>
      </motion.form>
    </div>
  );
}
