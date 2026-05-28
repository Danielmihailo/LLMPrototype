export class VoiceCapture {
  private recognition: SpeechRecognition | null = null;
  private onTranscript: (text: string) => void;
  private onListening: (active: boolean) => void;

  constructor(
    onTranscript: (text: string) => void,
    onListening: (active: boolean) => void,
  ) {
    this.onTranscript = onTranscript;
    this.onListening = onListening;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      const rec = this.recognition;
      rec.lang = "de-DE";
      rec.continuous = false;
      rec.onresult = (ev: SpeechRecognitionEvent) => {
        const text = ev.results[0][0].transcript;
        this.onTranscript(text);
      };
      rec.onend = () => this.onListening(false);
    }
  }

  start(): void {
    if (!this.recognition) {
      alert("Spracherkennung nicht verfügbar — Browser unterstützt kein Web Speech API.");
      return;
    }
    this.onListening(true);
    this.recognition.start();
  }

  stop(): void {
    this.recognition?.stop();
  }

  isSupported(): boolean {
    return !!this.recognition;
  }
}

export class VoiceVisualizer {
  private el: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = document.createElement("div");
    this.el.className = "voice-viz";
    this.el.innerHTML = `<button id="voice-btn" type="button">🎤 Voice</button><span id="voice-status"></span>`;
    parent.prepend(this.el);
    const style = document.createElement("style");
    style.textContent = `
      .voice-viz { margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem; }
      #voice-btn { background: transparent; border: 2px solid var(--jarvis-accent); color: var(--jarvis-accent); padding: 0.5rem 1rem; border-radius: 999px; cursor: pointer; box-shadow: var(--jarvis-glow); }
      #voice-btn.active { background: rgba(34,211,238,0.2); animation: pulse 1s infinite; }
      @keyframes pulse { 50% { box-shadow: 0 0 32px rgba(34,211,238,0.6); } }
    `;
    document.head.appendChild(style);
  }

  setListening(active: boolean): void {
    const btn = this.el.querySelector("#voice-btn") as HTMLButtonElement;
    const status = this.el.querySelector("#voice-status") as HTMLElement;
    btn.classList.toggle("active", active);
    status.textContent = active ? "Hört zu…" : "";
  }

  getButton(): HTMLButtonElement {
    return this.el.querySelector("#voice-btn") as HTMLButtonElement;
  }
}

export function speak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 1.05;
  speechSynthesis.speak(u);
}
