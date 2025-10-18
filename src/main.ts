import { detectAllPlayers, playerMap } from "./gesture/tracker";
// Draw player 1 points on debug canvas every frame
const debugCanvas = document.getElementById('debugPlayerMap') as HTMLCanvasElement | null;
const debugCtx = debugCanvas?.getContext('2d') ?? undefined;

function drawPlayer1Points() {
  if (!debugCtx) return;
  debugCtx.clearRect(0, 0, 640, 480);
  const points = playerMap.get(1);
  if (points) {
    debugCtx.fillStyle = '#ffeb3b';
    for (const [x, y] of points) {
      debugCtx.beginPath();
      debugCtx.arc(x, y, 2, 0, Math.PI * 2);
      debugCtx.fill();
    }
  }
}

// Print detectAllPlayers results every 1 second
setInterval(() => {
  const results = detectAllPlayers();

  drawPlayer1Points();
  if (results.results[1] !== null && results.results[1] !== undefined){
    console.log('detectAllPlayers', results.results[1], results.elapsedMs);
  }
}, 100);
// src/main.ts
import Phaser from "phaser";
import { VisionTuner, TunerParams } from "./tracking";
import { addPoint } from "./gesture/tracker";

class TunerScene extends Phaser.Scene {
  private vis!: VisionTuner;
  private rawImage!: Phaser.GameObjects.Image;
  private maskImage!: Phaser.GameObjects.Image;
  private gfx!: Phaser.GameObjects.Graphics;
  private posText!: Phaser.GameObjects.Text;
  private domPosEl?: HTMLElement;
  private lastFpsCheck: number = performance.now();
  private frameCount: number = 0;

  constructor() { super("TunerScene"); }

  preload() {}

  async create() {
    const W = 640, H = 480;
    const gap = 16;

    // Vision Tuner
    this.vis = new VisionTuner(W, H);

    // Create Phaser textures from canvases
    this.textures.addCanvas("raw", this.vis.rawCanvas);
    this.textures.addCanvas("mask", this.vis.maskCanvas);

    this.rawImage = this.add.image(0, 0, "raw").setOrigin(0, 0);
    this.maskImage = this.add.image(W + gap, 0, "mask").setOrigin(0, 0);

    // Resize the game to fit both views side-by-side
    this.scale.resize(W * 2 + gap, H);

    // Overlay graphics (crosshair)
    this.gfx = this.add.graphics();
    this.posText = this.add.text(10, 10, "x: –, y: –", { color: "#ffffff", fontSize: "18px" });
    this.domPosEl = document.getElementById("posDisplay") ?? undefined;

    // Bind Start button (user gesture required for some browsers to play video)
    const startBtn = document.getElementById("startBtn") as HTMLButtonElement | null;
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading OpenCV…";
    }

    this.vis.whenReady().then(() => {
      if (!startBtn) return;
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera";
    });

    startBtn?.addEventListener("click", async () => {
      await this.vis.startCamera();
      startBtn.setAttribute("disabled", "true");
      startBtn.textContent = "Camera Running";
    });

    // Bind sliders to params
    const bind = (id: string, key: keyof TunerParams) => {
      const el = document.getElementById(id) as HTMLInputElement;
      const label = document.getElementById(id + "V");
      const handler = () => {
        const val = Number(el.value);
        if (label) label.textContent = String(val);
        this.vis.setParams({ [key]: val } as Partial<TunerParams>);
      };
      el?.addEventListener("input", handler);
      handler();
    };

    bind("hMin", "hMin"); bind("hMax", "hMax");
    bind("sMin", "sMin"); bind("sMax", "sMax");
    bind("vMin", "vMin"); bind("vMax", "vMax");
    bind("bright", "bright");
  }

  update() {
    // Pump vision and track FPS only when a frame was processed
    const processed = this.vis.update();
    if (processed) {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsCheck > 1000) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCheck));
        console.log('OpenCV FPS:', fps);
        this.lastFpsCheck = now;
        this.frameCount = 0;
      }
    }

    // Refresh Phaser textures from canvases
  const rawTex = this.textures.get("raw") as Phaser.Textures.CanvasTexture;
    rawTex.context.drawImage(this.vis.rawCanvas, 0, 0);
    //maskTex.context.drawImage(this.vis.maskCanvas, 0, 0);
    rawTex.refresh();
    //maskTex.refresh();

    // Draw overlay crosshair on left view
    this.gfx.clear();
    if (this.vis.x !== null && this.vis.y !== null) {
      const x = this.vis.x;
      const y = this.vis.y;

      this.gfx.lineStyle(2, 0x00ff73, 1);
      this.gfx.strokeCircle(x, y, 12);
      this.gfx.lineBetween(x - 18, y, x + 18, y);
      this.gfx.lineBetween(x, y - 18, x, y + 18);
  const text = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
  this.posText.setText(text);
  if (this.domPosEl) this.domPosEl.textContent = text;

    // Add point to tracker for player 1
    addPoint(x, y, 1);
    } else {
    addPoint(0, 0, 1);
      this.posText.setText("x: –, y: –");
      if (this.domPosEl) this.domPosEl.textContent = "x: –, y: –";
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  width: 640 * 2 + 16, // left(raw) + gap + right(mask)
  height: 480,
  scene: [TunerScene]
});
