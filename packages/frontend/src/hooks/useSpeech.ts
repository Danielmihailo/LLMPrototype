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
 *  6. EN cloud voice → EN local
 */
function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const primary = voices.filter((v) =>
    v.lang.startsWith(lang.slice(0, 2)),
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
  const listeningRef = useRef(false); // track intent separately from state

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const getAPI = useCallback((): (new () => AnyRec) | null => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  /**
   * Start listening with continuous mode so Chrome doesn't auto-stop on pauses.
   * Fires onResult with the transcript when a final result arrives, then stops.
   * If no speech is detected and recognition ends on its own, calls onEnd.
   */
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
      r.continuous = true; // ← don't stop after each pause

      let gotResult = false;

      r.onresult = (e: any) => {
        // Only handle the latest result set
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const transcript = (e.results[i][0].transcript as string).trim();
            if (transcript) {
              gotResult = true;
              listeningRef.current = false;
              setIsListening(false);
              r.stop();
              onResult(transcript);
              onEnd?.();
              return;
            }
          }
        }
      };

      r.onend = () => {
        // Fired when recognition session ends (either manually or on error/timeout)
        if (!gotResult && listeningRef.current) {
          // Chrome ended the session before we got a result (e.g. 60s timeout).
          // Restart automatically.
          try {
            r.start();
            return;
          } catch {
            // Can't restart — fall through to cleanup
          }
        }
        listeningRef.current = false;
        setIsListening(false);
        if (!gotResult) onEnd?.();
      };

      r.onerror = (e: any) => {
        // "no-speech" is not fatal — recognition will auto-end and restart via onend
        if (e.error === "no-speech") return;
        listeningRef.current = false;
        setIsListening(false);
        onEnd?.();
      };

      recRef.current = r;
      listeningRef.current = true;
      setIsListening(true);
      r.start();
    },
    [getAPI, lang],
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  /** Speak text with the best available voice. */
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 1.0;
      utt.pitch = 1.0;
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
