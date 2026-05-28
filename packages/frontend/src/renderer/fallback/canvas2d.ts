export class Canvas2DFallback {
  private canvas: HTMLCanvasElement;
  private raf = 0;
  private pulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  start(): void {
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.loop();
  }

  setPulse(v: number): void {
    this.pulse = v;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  private loop = (): void => {
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.5);
      g.addColorStop(0, `rgba(34, 211, 238, ${0.05 + this.pulse * 0.15})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
