import { useState, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = any; // SpeechRecognition varies across browsers/TS versions

export function useSpeech(lang = "de-DE") {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);
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
      if (recRef.current) { try { recRef.current.abort(); } catch { /* ignore */ } }

      const r: AnyRec = new API();
      r.lang = lang;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;

      r.onresult = (e: any) => {
        if (e.results?.length > 0) {
          const transcript = (e.results[e.results.length - 1][0].transcript as string).trim();
          onResult(transcript);
        }
      };
      r.onend  = () => { setIsListening(false); onEnd?.(); };
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

  /** Speak text via TTS. */
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang   = lang;
      utt.rate   = 1.05;
      utt.pitch  = 0.92;
      utt.volume = 1;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const v =
          voices.find((v) => v.lang.startsWith("de") && v.localService) ??
          voices.find((v) => v.lang.startsWith("de")) ??
          voices.find((v) => v.lang.startsWith("en"));
        if (v) utt.voice = v;
      };

      if (window.speechSynthesis.getVoices().length) {
        pickVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = pickVoice;
      }

      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => { setIsSpeaking(false); onDone?.(); };
      utt.onerror = () => setIsSpeaking(false);

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
