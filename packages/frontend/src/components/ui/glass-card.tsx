import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "rounded-xl backdrop-blur-xl transition-all duration-300",
  {
    variants: {
      intensity: {
        light: "bg-white/[0.03] border border-cyan-500/10 shadow-sm",
        medium: "bg-white/[0.05] border border-cyan-500/15 shadow-md",
        heavy: "bg-white/[0.08] border border-cyan-500/20 shadow-lg",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-cyan-sm",
        glow: "hover:shadow-cyan-md hover:border-cyan-500/30",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: { intensity: "medium", hover: "lift", padding: "md" },
  },
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, intensity, hover, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ intensity, hover, padding }), className)}
      {...props}
    />
  ),
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
