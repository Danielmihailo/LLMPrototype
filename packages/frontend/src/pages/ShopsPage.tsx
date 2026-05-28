import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Store, Plus, ShoppingBag, Globe, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState } from "@/store/state";
import { api, type Shop } from "@/lib/api";

const platformIcons: Record<string, React.FC<{ className?: string }>> = {
  shopify: ShoppingBag,
  wordpress: Globe,
  greenfield: Zap,
};

const platformColors = {
  shopify: "green" as const,
  wordpress: "blue" as const,
  greenfield: "cyan" as const,
};

export function ShopsPage() {
  const { state, dispatch } = useAppState();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.userId) {
      dispatch({ type: "NAVIGATE", payload: "login" });
      return;
    }
    api.listShops()
      .then(({ shops }) => setShops(shops))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [state.userId, dispatch]);

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Meine Shops
            </h1>
            <p className="text-sm text-slate-500">Verbinde JARVIS mit deinen Online-Shops</p>
          </div>
          <GradientButton gradient="cyan" size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            Shop verbinden
          </GradientButton>
        </motion.div>

        {/* Grid */}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Store className="size-8 text-slate-600" />
            </div>
            <p className="text-slate-500 text-sm">Noch kein Shop verbunden</p>
            <GradientButton gradient="cyan" size="md">
              <Plus className="size-4" />
              Ersten Shop verbinden
            </GradientButton>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop, i) => {
              const Icon = platformIcons[shop.platform] ?? Store;
              const color = platformColors[shop.platform as keyof typeof platformColors] ?? "cyan";
              return (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard intensity="medium" hover="glow" padding="md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <Icon className="size-5 text-cyan-400" />
                      </div>
                      <NeonBadge color={color} className="capitalize text-[9px]">
                        {shop.platform}
                      </NeonBadge>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{shop.name}</h3>
                    {shop.domain && (
                      <p className="text-xs text-slate-600 font-mono">{shop.domain}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <button
                        onClick={() => {
                          dispatch({ type: "SET_SHOP_CONNECTION", payload: shop.id });
                          dispatch({ type: "NAVIGATE", payload: "chat" });
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Mit JARVIS steuern →
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
