import { AnimatePresence, motion } from "framer-motion";
import { useAppState } from "@/store/state";
import { LoginPage } from "@/pages/LoginPage";
import { ChatPage } from "@/pages/ChatPage";

export default function App() {
  const { state } = useAppState();

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        {!state.userId ? (
          <motion.div
            key="login"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LoginPage />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ChatPage />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
