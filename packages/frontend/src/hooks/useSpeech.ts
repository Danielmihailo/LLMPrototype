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

export function useSpeech(lang = "de-DE") {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking]   = useState(false);

  const recRef       = useRef<AnyRec>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const listeningRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const getAPI = useCallback((): (new () => AnyRec) | null => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  /* ── Web Speech TTS (fallback) ──────────────────────────────────── */
  const speakWebSpeech = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis) { onDone?.(); return; }
      window.speechSynthesis.cancel();

      const utt    = new SpeechSynthesisUtterance(text);
      utt.lang     = lang;
      utt.rate     = 1.0;
      utt.pitch    = 1.0;
      utt.volume   = 1;

      const applyVoice = () => {
        const v = pickBestVoice(lang);
        if (v) utt.voice = v;
      };
      if (window.speechSynthesis.getVoices().length) {
        applyVoice();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          applyVoice();
          window.speechSynthesis.onvoiceschanged = null;
        };
      }

      utt.onstart = () => setIsSpeaking(true);
      utt.onend   = () => { setIsSpeaking(false); onDone?.(); };
      utt.onerror = () => { setIsSpeaking(false); onDone?.(); };
      window.speechSynthesis.speak(utt);
    },
    [lang],
  );

  /* ── Backend TTS (OpenAI nova voice — human quality) ────────────── */
  const speak = useCallback(
    async (text: string, onDone?: () => void) => {
      // Cancel any current playback
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const res = await fetch("/v1/tts", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) throw new Error(`TTS ${res.status}`);

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onDone?.();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          onDone?.();
        };
        await audio.play();
      } catch {
        // Backend TTS not available → fall back to Web Speech
        speakWebSpeech(text, onDone);
      }
    },
    [speakWebSpeech],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  /* ── Speech recognition (continuous mode) ───────────────────────── */
  const startListening = useCallback(
    (onResult: (text: string) => void, onEnd?: () => void) => {
      const API = getAPI();
      if (!API) return;
      if (recRef.current) {
        try { recRef.current.abort(); } catch { /* ignore */ }
      }

      const r: AnyRec = new API();
      r.lang            = lang;
      r.interimResults  = false;
      r.maxAlternatives = 1;
      r.continuous      = true; // don't auto-stop on pauses

      let gotResult = false;

      r.onresult = (e: any) => {
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
        if (!gotResult && listeningRef.current) {
          // Session dropped before result — restart
          try { r.start(); return; } catch { /* fall through */ }
        }
        listeningRef.current = false;
        setIsListening(false);
        if (!gotResult) onEnd?.();
      };

      r.onerror = (e: any) => {
        if (e.error === "no-speech") return; // non-fatal
        listeningRef.current = false;
        setIsListening(false);
        onEnd?.();
      };

      recRef.current       = r;
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

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,          // backend TTS with Web Speech fallback
    stopSpeaking,
    supported,
  };
}
