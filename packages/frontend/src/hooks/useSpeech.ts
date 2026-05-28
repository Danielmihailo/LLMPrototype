import { useState, useRef, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── Web Speech fallback voice selection ─────────────────────────────── */
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
    null
  );
}

export type SpeechError =
  | "permission-denied"
  | "not-supported"
  | "no-speech"
  | "unknown";

const SILENCE_THRESHOLD = 8;     // RMS amplitude (0–255) below = silence
const SILENCE_DURATION  = 1500;  // ms of silence before auto-stop
const MAX_RECORD_MS     = 30_000; // safety cap

export function useSpeech(lang = "de-DE") {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [micError,    setMicError]    = useState<SpeechError | null>(null);

  const mediaRecRef   = useRef<MediaRecorder | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const stopTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef        = useRef<number | null>(null);

  const supported = typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;

  /* ── internal: clean up recording resources ─────────────────────── */
  const cleanup = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    if (rafRef.current)       { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current)    { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    mediaRecRef.current = null;
  }, []);

  /* ── startListening: MediaRecorder + Groq Whisper STT ───────────── */
  const startListening = useCallback(
    (onResult: (text: string) => void, onEnd?: () => void) => {
      if (!supported) { setMicError("not-supported"); return; }

      setMicError(null);
      chunksRef.current = [];

      navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
        .then((stream) => {
          streamRef.current = stream;

          /* ── silence detection via Web Audio ── */
          const audioCtx  = new AudioContext();
          const source    = audioCtx.createMediaStreamSource(stream);
          const analyser  = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArr   = new Uint8Array(analyser.frequencyBinCount);
          let silenceStart = 0;
          let speechSeen   = false;

          const checkLevel = () => {
            analyser.getByteFrequencyData(dataArr);
            const rms = Math.sqrt(dataArr.reduce((s, v) => s + v * v, 0) / dataArr.length);

            if (rms > SILENCE_THRESHOLD) {
              speechSeen   = true;
              silenceStart = 0;
            } else if (speechSeen) {
              if (silenceStart === 0) silenceStart = Date.now();
              if (Date.now() - silenceStart > SILENCE_DURATION) {
                // Stop after sustained silence
                void audioCtx.close();
                stopListeningInternal();
                return;
              }
            }
            rafRef.current = requestAnimationFrame(checkLevel);
          };
          rafRef.current = requestAnimationFrame(checkLevel);

          /* ── MediaRecorder ── */
          const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/ogg";

          const rec = new MediaRecorder(stream, { mimeType });
          mediaRecRef.current = rec;

          rec.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          rec.onstop = async () => {
            cleanup();
            setIsListening(false);

            const blob = new Blob(chunksRef.current, { type: mimeType });
            if (blob.size < 500) { onEnd?.(); return; } // too short — ignore

            try {
              const res = await fetch("/v1/stt", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": mimeType },
                body: blob,
              });
              if (!res.ok) throw new Error(`STT ${res.status}`);
              const { text } = await res.json() as { text: string };
              if (text.trim()) {
                onResult(text.trim());
              } else {
                onEnd?.();
              }
            } catch (err) {
              console.error("[useSpeech] STT error:", err);
              setMicError("unknown");
              onEnd?.();
            }
          };

          rec.start(250); // collect chunks every 250ms
          setIsListening(true);

          // Safety cap: stop after MAX_RECORD_MS regardless
          stopTimerRef.current = setTimeout(() => {
            stopListeningInternal();
          }, MAX_RECORD_MS);
        })
        .catch((err: Error) => {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setMicError("permission-denied");
          } else {
            setMicError("unknown");
            console.error("[useSpeech] getUserMedia error:", err);
          }
          onEnd?.();
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supported, cleanup],
  );

  /* ── internal stop (called from silence detection or timer) ─────── */
  function stopListeningInternal() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop(); // triggers rec.onstop → sends to STT
    }
  }

  /* ── public stop (user clicked mic to cancel) ───────────────────── */
  const stopListening = useCallback(() => {
    // Discard recording by clearing chunks before stop fires onstop
    chunksRef.current = [];
    stopListeningInternal();
    cleanup();
    setIsListening(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup]);

  /* ── TTS: backend (OpenAI nova) with Web Speech fallback ────────── */
  const speakWebSpeech = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const utt    = new SpeechSynthesisUtterance(text);
    utt.lang     = lang;
    utt.rate     = 1.0;
    utt.pitch    = 1.0;
    utt.volume   = 1;
    const apply  = () => { const v = pickBestVoice(lang); if (v) utt.voice = v; };
    if (window.speechSynthesis.getVoices().length) apply();
    else window.speechSynthesis.onvoiceschanged = () => { apply(); window.speechSynthesis.onvoiceschanged = null; };
    utt.onstart  = () => setIsSpeaking(true);
    utt.onend    = () => { setIsSpeaking(false); onDone?.(); };
    utt.onerror  = () => { setIsSpeaking(false); onDone?.(); };
    window.speechSynthesis.speak(utt);
  }, [lang]);

  const speak = useCallback(async (text: string, onDone?: () => void) => {
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
