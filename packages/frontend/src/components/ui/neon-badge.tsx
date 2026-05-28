import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const neonBadgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
  {
    variants: {
      color: {
        cyan: "border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)] hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]",
        purple: "border border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]",
        green: "border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)] hover:shadow-[0_0_20px_rgba(52,211,153,0.5)]",
        pink: "border border-pink-500/50 bg-pink-500/10 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.3)]",
        orange: "border border-orange-500/50 bg-orange-500/10 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
        blue: "border border-blue-500/50 bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: { color: "cyan", pulse: false },
  },
);

export interface NeonBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof neonBadgeVariants> {}

const NeonBadge = React.forwardRef<HTMLSpanElement, NeonBadgeProps>(
  ({ className, color, pulse, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(neonBadgeVariants({ color, pulse }), className)}
      {...props}
    />
  ),
);
NeonBadge.displayName = "NeonBadge";

export { NeonBadge };
