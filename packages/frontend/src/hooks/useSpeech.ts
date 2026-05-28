import { useState, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = any;

/**
 * Voice priority (highest → lowest):
 *  1. "Natural" in name  → Microsoft Neural (Edge)
 *  2. "Online" in name   → cloud voice
 *  3. "Neural" in name   → labeled neural
 *  4. !localService       → any cloud DE voice
 *  5. Any DE local voice
 *  6. EN cloud voice
 *  7. Any EN voice
 */
function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const isDE = lang.startsWith("de");
  const primary = voices.filter((v) =>
    isDE ? v.lang.startsWith("de") : v.lang.startsWith(lang.slice(0, 2)),
  );

  const n = (v: SpeechSynthesisVoice) => v.name.toLowerCase();

  return (
    primary.find((v) => n(v).includes("natural")) ??
    primary.find((v) => n(v).includes("online")) ??
    primary.find((v) => n(v).includes("neural")) ??
    primary.find((v) => !v.localService) ??
    primary[0] ??
    voices.find((v) => v.lang.startsWith("en") && !v.localService) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

export function useSpeech(lang = "de-DE") {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recRef = useRef<AnyRec>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const getAPI = useCallback((): (new () => AnyRec) | null => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  /** Start listening. Calls onResult with final transcript, then onEnd. */
  const startListening = useCallback(
    (onResult: (text: string) => void, onEnd?: () => void) => {
      const API = getAPI();
      if (!API) return;
      if (recRef.current) {
        try { recRef.current.abort(); } catch { /* ignore */ }
      }

      const r: AnyRec = new API();
      r.lang = lang;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;

      r.onresult = (e: any) => {
        if (e.results?.length > 0) {
          const transcript = (
            e.results[e.results.length - 1][0].transcript as string
          ).trim();
          onResult(transcript);
        }
      };
      r.onend = () => { setIsListening(false); onEnd?.(); };
      r.onerror = () => { setIsListening(false); };

      recRef.current = r;
      r.start();
      setIsListening(true);
    },
    [getAPI, lang],
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setIsListening(false);
  }, []);

  /** Speak text with the best available voice. */
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 1.0;   // natural pacing
      utt.pitch = 1.0;  // neutral pitch
      utt.volume = 1;

      const applyVoice = () => {
        const v = pickBestVoice(lang);
        if (v) utt.voice = v;
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        applyVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          applyVoice();
          window.speechSynthesis.onvoiceschanged = null;
        };
      }

      utt.onstart = () => setIsSpeaking(true);
      utt.onend = () => { setIsSpeaking(false); onDone?.(); };
      utt.onerror = () => { setIsSpeaking(false); onDone?.(); };

      window.speechSynthesis.speak(utt);
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    supported,
  };
}
