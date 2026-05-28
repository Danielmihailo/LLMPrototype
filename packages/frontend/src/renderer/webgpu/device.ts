export class HoloViewport {
  private canvas: HTMLCanvasElement;
  private pulse = 0;
  private raf = 0;
  private webgpu = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<void> {
    if (navigator.gpu) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        await adapter.requestDevice();
        this.webgpu = true;
      }
    }
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.animate();
  }

  setPulse(v: number): void {
    this.pulse = Math.min(1, Math.max(0, v));
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  private animate = (): void => {
    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);
      const t = Date.now() * 0.001;
      const cx = w / 2;
      const cy = h / 2;
      const rings = this.webgpu ? 8 : 6;
      for (let i = 0; i < rings; i++) {
        const r = (Math.sin(t + i) * 0.5 + 0.5) * (h * 0.35) + this.pulse * 40;
        ctx.beginPath();
        ctx.arc(cx, cy, r + i * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.08 + this.pulse * 0.2})`;
        ctx.lineWidth = this.webgpu ? 3 : 2;
        ctx.stroke();
      }
    }
    this.raf = requestAnimationFrame(this.animate);
  };

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }
}
