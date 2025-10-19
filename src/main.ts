// src/main.ts
import Phaser from "phaser";
import { VisionTuner } from "./tracking";

class SweepScene extends Phaser.Scene {
  private vis!: VisionTuner;
  private rawImage!: Phaser.GameObjects.Image;
  private maskImage!: Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Graphics;
  private posText!: Phaser.GameObjects.Text;
  private hsvText!: Phaser.GameObjects.Text;

  private domStatus?: HTMLElement;
  private domPos?: HTMLElement;
  private domParams?: HTMLElement;
  private cameraStarted = false;

  constructor() {
    super("SweepScene");
  }

  preload() {}

  async create() {
    const W = 640;
    const H = 480;
    const gap = 16;

    this.vis = new VisionTuner(W, H);

    this.textures.addCanvas("raw", this.vis.rawCanvas);
    this.textures.addCanvas("mask", this.vis.maskCanvas);

    this.rawImage = this.add.image(0, 0, "raw").setOrigin(0, 0);
    this.maskImage = this.add.image(W + gap, 0, "mask").setOrigin(0, 0);

    this.scale.resize(W * 2 + gap, H);

    this.overlay = this.add.graphics();
    this.posText = this.add.text(12, 12, "x: –, y: –", { color: "#ffffff", fontSize: "18px" });
    this.hsvText = this.add.text(12, 36, "HSV: –, –, –", { color: "#8bd9ff", fontSize: "16px" });

    this.domStatus = document.getElementById("status") ?? undefined;
    this.domPos = document.getElementById("posDisplay") ?? undefined;
    this.domParams = document.getElementById("paramDisplay") ?? undefined;

    const startBtn = document.getElementById("startBtn") as HTMLButtonElement | null;
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading OpenCV…";
    }

    this.vis.whenReady().then(() => {
      if (!startBtn) return;
      startBtn.disabled = false;
      startBtn.textContent = "Start Camera";
      if (this.domStatus) this.domStatus.textContent = "Ready. Allow camera access and click start.";
    });

    startBtn?.addEventListener("click", async () => {
      await this.vis.startCamera();
      this.cameraStarted = true;
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = "Camera Running";
      }
      if (this.domStatus) this.domStatus.textContent = "Cover the camera with the glowing ball to auto-calibrate.";
    });

  }

  update() {
    this.vis.update();

    const rawTex = this.textures.get("raw") as Phaser.Textures.CanvasTexture;
    const maskTex = this.textures.get("mask") as Phaser.Textures.CanvasTexture;
    rawTex.context.drawImage(this.vis.rawCanvas, 0, 0);
    maskTex.context.drawImage(this.vis.maskCanvas, 0, 0);
    rawTex.refresh();
    maskTex.refresh();

    this.overlay.clear();
    if (this.vis.x !== null && this.vis.y !== null && this.vis.radius !== null) {
      const x = this.vis.x;
      const y = this.vis.y;
      const radius = Math.max(10, this.vis.radius);

      this.overlay.lineStyle(2, 0x00ff73, 1);
      this.overlay.strokeCircle(x, y, radius + 6);
      this.overlay.lineBetween(x - 20, y, x + 20, y);
      this.overlay.lineBetween(x, y - 20, x, y + 20);

      const message = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
      this.posText.setText(message);
      if (this.domPos) this.domPos.textContent = message;
    } else {
      this.posText.setText("x: –, y: –");
      if (this.domPos) this.domPos.textContent = "–, –";
    }

    const activeParams = this.vis.bestParams || this.vis.lockedParams;
    if (activeParams) {
      const p = activeParams;
      const text = `HSV: H[${p.hMin}-${p.hMax}], S[${p.sMin}-${p.sMax}], V[${p.vMin}-${p.vMax}]`;
      this.hsvText.setText(text);
      if (this.domParams) this.domParams.textContent = text;
    } else {
      this.hsvText.setText("HSV: –, –, –");
      if (this.domParams) this.domParams.textContent = "–";
    }

    if (this.domStatus && this.cameraStarted) {
      this.domStatus.textContent = this.vis.isLocked()
        ? "Tracking locked. Cover the camera again to refresh."
        : "Waiting for auto-calibration… cover the camera with the glowing ball.";
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  width: 640 * 2 + 16,
  height: 480,
  scene: [SweepScene]
});
