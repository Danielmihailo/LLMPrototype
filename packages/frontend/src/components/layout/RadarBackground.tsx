import { motion } from "framer-motion";

const rings = [1, 2, 3, 4, 5, 6];

export function RadarBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden">
      {/* Radial gradient center glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.04)_0%,transparent_65%)]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Concentric rings */}
      {rings.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-500/[0.06]"
          style={{
            width: `${i * 160}px`,
            height: `${i * 160}px`,
          }}
          animate={{
            opacity: [0.06, 0.15, 0.06],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Center dot */}
      <motion.div
        className="absolute size-2 rounded-full bg-cyan-400"
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "0 0 12px rgba(34,211,238,0.8)" }}
      />
    </div>
  );
}
