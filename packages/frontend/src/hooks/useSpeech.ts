import { useState, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRec = any;

/* ── Web Speech fallback voice selection ────────────────────────────── */
function pickBestVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const primary = voices.filter((v) => v.lang.startsWith(lang.slice(0, 2)));
  const n = (v: SpeechSynthesisVoice) => v.name.toLowerCase();
  return (
    primary.find((v) => n(v).includes("natural")) ??
    primary.find((v) => n(v).includes("online"))  ??
    primary.find((v) => n(v).includes("neural"))  ??
    primary.find((v) => !v.localService)           ??
    primary[0]                                     ??
    voices.find((v) => v.lang.startsWith("en") && !v.localService) ??
    voices.find((v) => v.lang.startsWith("en"))    ??
    null
  );
}

export type SpeechError = "not-supported" | "permission-denied" | "no-speech" | "network" | "unknown";

export function useSpeech(lang = "de-DE") {
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [micError, setMicError]         = useState<SpeechError | null>(null);

  const recRef      = useRef<AnyRec>(null);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const activeRef   = useRef(false); // intent: should be listening

  const SpeechAPI = useCallback((): (new () => AnyRec) | null => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  const supported = typeof window !== "undefined" &&
    !!(((window as any).SpeechRecognition) ?? ((window as any).webkitSpeechRecognition));

  /* ── Backend TTS (OpenAI nova) with Web Speech fallback ────────── */
  const speakWebSpeech = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = lang;
    utt.rate   = 1.0;
    utt.pitch  = 1.0;
    utt.volume = 1;
    const applyVoice = () => {
      const v = pickBestVoice(lang);
      if (v) utt.voice = v;
    };
    if (window.speechSynthesis.getVoices().length) applyVoice();
    else window.speechSynthesis.onvoiceschanged = () => { applyVoice(); window.speechSynthesis.onvoiceschanged = null; };
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => { setIsSpeaking(false); onDone?.(); };
    utt.onerror = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utt);
  }, [lang]);

  const speak = useCallback(async (text: string, onDone?: () => void) => {
    // Cancel current playback
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    try {
      const res = await fetch("/v1/tts", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);

      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsSpeaking(true);

      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; onDone?.(); };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; onDone?.(); };
      await audio.play();
    } catch {
      speakWebSpeech(text, onDone);
    }
  }, [speakWebSpeech]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);

  /* ── Speech recognition ─────────────────────────────────────────── */
  /**
   * Creates a FRESH SpeechRecognition instance every call.
   * continuous=false is the most reliable mode across browsers.
   * The conversation loop (in ChatPage) re-calls startListening after each exchange.
   */
  const startListening = useCallback(
    (onResult: (text: string) => void, onEnd?: () => void) => {
      const API = SpeechAPI();
      if (!API) {
        setMicError("not-supported");
        return;
      }

      // Always destroy old instance first
      if (recRef.current) {
        try { recRef.current.abort(); } catch { /* ignore */ }
        recRef.current = null;
      }

      setMicError(null);
      const r: AnyRec = new API();
      r.lang            = lang;
      r.continuous      = false;     // single utterance — most reliable
      r.interimResults  = false;     // only fire on final result
      r.maxAlternatives = 1;

      let fired = false;

      r.onresult = (e: any) => {
        const result = e.results?.[e.results.length - 1];
        if (result?.isFinal) {
          const transcript = (result[0].transcript as string).trim();
          if (transcript) {
            fired = true;
            onResult(transcript);
          }
        }
      };

      r.onend = () => {
        activeRef.current = false;
        setIsListening(false);
        recRef.current = null;
        if (!fired) onEnd?.(); // only call onEnd if no result was delivered
      };

      r.onerror = (e: any) => {
        recRef.current = null;
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicError("permission-denied");
          activeRef.current = false;
          setIsListening(false);
          onEnd?.();
          return;
        }
        if (e.error === "network") {
          setMicError("network");
        }
        // "no-speech" and "aborted" are non-fatal — onend will fire and clean up
      };

      recRef.current    = r;
      activeRef.current = true;
      setIsListening(true);

      try {
        r.start();
      } catch (err) {
        console.error("[useSpeech] r.start() failed:", err);
        activeRef.current = false;
        setIsListening(false);
        recRef.current = null;
        setMicError("unknown");
        onEnd?.();
      }
    },
    [SpeechAPI, lang],
  );

  const stopListening = useCallback(() => {
    activeRef.current = false;
    setIsListening(false);
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ignore */ }
      recRef.current = null;
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    micError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    supported,
  };
}
