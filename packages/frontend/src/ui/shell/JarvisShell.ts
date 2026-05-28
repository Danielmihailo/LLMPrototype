import { HoloViewport } from "../../renderer/webgpu/device.js";
import { Canvas2DFallback } from "../../renderer/fallback/canvas2d.js";

export class JarvisShell {
  private root: HTMLElement;
  private holoCanvas: HTMLCanvasElement;
  private holo: HoloViewport | Canvas2DFallback;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = `
      <div class="jarvis-shell">
        <canvas id="holo" class="holo-canvas"></canvas>
        <div class="jarvis-overlay">
          <header class="jarvis-header">
            <span class="logo">JARVIS</span>
            <nav id="nav"></nav>
          </header>
          <main id="main" class="jarvis-main"></main>
        </div>
      </div>`;

    const style = document.createElement("style");
    style.textContent = `
      .jarvis-shell { position: relative; height: 100%; overflow: hidden; }
      .holo-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .jarvis-overlay { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; pointer-events: none; }
      .jarvis-header, .jarvis-main { pointer-events: auto; }
      .jarvis-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: linear-gradient(180deg, rgba(3,7,18,0.9), transparent); }
      .logo { font-size: 1.25rem; letter-spacing: 0.3em; color: var(--jarvis-accent); text-shadow: var(--jarvis-glow); }
      #nav button { background: transparent; border: 1px solid var(--jarvis-accent-dim); color: var(--jarvis-text); margin-left: 0.5rem; padding: 0.4rem 0.8rem; cursor: pointer; border-radius: 4px; }
      #nav button:hover { box-shadow: var(--jarvis-glow); }
      .jarvis-main { flex: 1; padding: 1rem 1.5rem 2rem; overflow: auto; }
    `;
    document.head.appendChild(style);

    this.holoCanvas = this.root.querySelector("#holo") as HTMLCanvasElement;
    this.holo = new HoloViewport(this.holoCanvas);
    this.holo.init().catch(() => {
      this.holo = new Canvas2DFallback(this.holoCanvas);
      (this.holo as Canvas2DFallback).start();
    });
  }

  getMain(): HTMLElement {
    return this.root.querySelector("#main") as HTMLElement;
  }

  getNav(): HTMLElement {
    return this.root.querySelector("#nav") as HTMLElement;
  }

  setPulse(intensity: number): void {
    if ("setPulse" in this.holo) {
      (this.holo as HoloViewport).setPulse(intensity);
    }
  }
}
