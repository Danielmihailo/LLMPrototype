import { AnimatePresence, motion } from "framer-motion";
import { RadarBackground } from "@/components/layout/RadarBackground";
import { Navbar } from "@/components/layout/Navbar";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { ChatPage } from "@/pages/ChatPage";
import { ShopsPage } from "@/pages/ShopsPage";
import { useAppState } from "@/store/state";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function App() {
  const { state } = useAppState();

  return (
    <div className="relative min-h-screen bg-[#030712] overflow-x-hidden">
      <RadarBackground />
      <Navbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={state.currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {state.currentPage === "home" && <HomePage />}
          {state.currentPage === "login" && <LoginPage />}
          {state.currentPage === "chat" && <ChatPage />}
          {state.currentPage === "shops" && <ShopsPage />}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
