/// <reference types="@webgpu/types" />

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
