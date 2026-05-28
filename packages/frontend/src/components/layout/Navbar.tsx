import { motion } from "framer-motion";
import { MessageSquare, Store, Home, LogIn, LogOut, Zap } from "lucide-react";
import { NeonBadge } from "@/components/ui/neon-badge";
import { useAppState, type Page } from "@/store/state";
import { api } from "@/lib/api";

export function Navbar() {
  const { state, dispatch } = useAppState();

  const navigate = (page: Page) => dispatch({ type: "NAVIGATE", payload: page });

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "SET_CONVERSATION", payload: null });
    navigate("home");
  };

  const navItems = [
    { page: "home" as Page, label: "Home", icon: Home },
    { page: "chat" as Page, label: "Chat", icon: MessageSquare },
    { page: "shops" as Page, label: "Shops", icon: Store },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="glass-md rounded-2xl px-5 py-3 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate("home")}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative">
              <Zap
                className="size-6 text-cyan-400 group-hover:text-cyan-300 transition-colors"
                style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.6))" }}
              />
            </div>
            <span
              className="text-lg font-bold tracking-widest text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              JARVIS
            </span>
            <NeonBadge color="cyan" pulse={true} className="text-[9px] px-2 py-0.5">
              AI
            </NeonBadge>
          </button>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ page, label, icon: Icon }) => (
              <button
                key={page}
                onClick={() => navigate(page)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  state.currentPage === page
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {state.userId ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:block">Logout</span>
              </button>
            ) : (
              <button
                onClick={() => navigate("login")}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all duration-200"
              >
                <LogIn className="size-4" />
                <span className="hidden sm:block">Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
