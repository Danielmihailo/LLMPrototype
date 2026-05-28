import { AnimatePresence, motion } from "framer-motion";
import { useAppState } from "@/store/state";
import { LoginPage } from "@/pages/LoginPage";
import { ChatPage } from "@/pages/ChatPage";

export default function App() {
  const { state } = useAppState();

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <AnimatePresence mode="wait">
        {!state.userId ? (
          <motion.div
            key="login"
            style={{ position: "absolute", inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            style={{ position: "absolute", inset: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <ChatPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
