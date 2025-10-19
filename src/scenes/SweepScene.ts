
import { VisionTuner, SweepParams } from "../tracking";
import { addPoint } from "../gesture/tracker";

export default class SweepScene extends Phaser.Scene {
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
  private sliderBindings: Partial<Record<keyof SweepParams, { input: HTMLInputElement; value: HTMLElement }>> = {};
  private brightnessInput?: HTMLInputElement;
  private brightnessValue?: HTMLElement;
  private updatingSliders = false;
  private lastSyncedParams: SweepParams | null = null;
  private lastSyncedBrightness = 0;
  private frameCount = 0;
  private lastFpsCheck = performance.now();

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

    this.setupManualControls();

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
    // Pump vision and track FPS only when a frame was processed
    const processed = this.vis.update();
    if (processed) {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsCheck > 1000) {
        const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCheck));
        console.log("OpenCV FPS:", fps);
        this.lastFpsCheck = now;
        this.frameCount = 0;
      }
    }

    this.syncManualControls();

    // Refresh Phaser textures from canvases
    const rawTex = this.textures.get("raw") as Phaser.Textures.CanvasTexture;
    const maskTex = this.textures.get("mask") as Phaser.Textures.CanvasTexture;
    rawTex.context.drawImage(this.vis.rawCanvas, 0, 0);
    maskTex.context.drawImage(this.vis.maskCanvas, 0, 0);
    rawTex.refresh();
    maskTex.refresh();

    // Draw overlay crosshair on left view
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
	  addPoint(x,y, 1);
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

  private setupManualControls() {
    const sliderDefs: Array<{ key: keyof SweepParams; inputId: string; valueId: string; step?: number }> = [
      { key: "hMin", inputId: "slider-hMin", valueId: "value-hMin" },
      { key: "hMax", inputId: "slider-hMax", valueId: "value-hMax" },
      { key: "sMin", inputId: "slider-sMin", valueId: "value-sMin" },
      { key: "sMax", inputId: "slider-sMax", valueId: "value-sMax" },
      { key: "vMin", inputId: "slider-vMin", valueId: "value-vMin" },
      { key: "vMax", inputId: "slider-vMax", valueId: "value-vMax" }
    ];

    sliderDefs.forEach(({ key, inputId, valueId, step }) => {
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      const valueEl = document.getElementById(valueId);
      if (!input || !valueEl) return;
      if (step) input.step = step.toString();
      this.sliderBindings[key] = { input, value: valueEl };
      valueEl.textContent = input.value;
      input.addEventListener("input", () => {
        if (this.updatingSliders) return;
        const val = Number(input.value);
        this.vis.setManualParam(key, val);
        valueEl.textContent = String(Math.round(val));
        this.lastSyncedParams = null;
      });
    });

    this.brightnessInput = document.getElementById("slider-bright") as HTMLInputElement | null ?? undefined;
    this.brightnessValue = document.getElementById("value-bright") ?? undefined;
    if (this.brightnessInput && this.brightnessValue) {
      this.brightnessValue.textContent = this.brightnessInput.value;
      this.brightnessInput.addEventListener("input", () => {
        const val = Number(this.brightnessInput!.value);
        this.vis.setBrightness(val);
        this.brightnessValue!.textContent = `${val >= 0 ? "+" : ""}${val}`;
        this.lastSyncedBrightness = val;
      });
    }
  }

  private syncManualControls() {
    const manual = this.vis.getManualParams();
    if (manual && !this.vis.isManualDirty()) {
      if (!this.lastSyncedParams || !this.paramsEqual(this.lastSyncedParams, manual)) {
        this.updatingSliders = true;
        (Object.keys(this.sliderBindings) as Array<keyof SweepParams>).forEach((key) => {
          const binding = this.sliderBindings[key];
          if (!binding) return;
          const val = manual[key];
          binding.input.value = String(Math.round(val));
          binding.value.textContent = String(Math.round(val));
        });
        this.updatingSliders = false;
        this.lastSyncedParams = { ...manual };
      }
    }

    if (this.brightnessInput && this.brightnessValue) {
      const currentBright = this.vis.getBrightness();
      if (currentBright !== this.lastSyncedBrightness) {
        this.updatingSliders = true;
        this.brightnessInput.value = String(currentBright);
        this.brightnessValue.textContent = `${currentBright >= 0 ? "+" : ""}${currentBright}`;
        this.updatingSliders = false;
        this.lastSyncedBrightness = currentBright;
      }
    }
  }

  private paramsEqual(a: SweepParams, b: SweepParams) {
    return a.hMin === b.hMin && a.hMax === b.hMax &&
      a.sMin === b.sMin && a.sMax === b.sMax &&
      a.vMin === b.vMin && a.vMax === b.vMax;
  }
}



