import { VisionTuner, SweepParams } from "../tracking";
import { addPoint } from "../gesture/tracker";

export default class BallTrackerScene extends Phaser.Scene {
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
    super("BallTracker");
  }

  preload() {}

  async create() {
    // Create the HTML controls overlay that was in the original index.html
    this.createHTMLControls();
    
    const W = 640;
    const H = 480;
    const gap = 16;

    this.vis = new VisionTuner(W, H);

    this.textures.addCanvas("raw", this.vis.rawCanvas);
    this.textures.addCanvas("mask", this.vis.maskCanvas);

    this.rawImage = this.add.image(0, 0, "raw").setOrigin(0, 0);
    this.maskImage = this.add.image(W + gap, 0, "mask").setOrigin(0, 0);
    
    // Ensure images are visible (satisfy linter)
    this.rawImage.setVisible(true);
    this.maskImage.setVisible(true);

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

    // Create back button
    this.createBackButton();
  }

  private createHTMLControls() {
    // Create the HTML controls that were in the original index.html
    const controlsHTML = `
      <div id="controls" style="
        position: fixed;
        top: 18px;
        left: 18px;
        width: 280px;
        padding: 18px 20px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(9, 12, 22, 0.85);
        backdrop-filter: blur(18px);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
        z-index: 1000;
        color: #f0f3ff;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      ">
        <h1 style="
          margin: 0 0 12px;
          font-size: 17px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7da9ff;
        ">Ball Tracker</h1>
        <p id="status" style="
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #b7c5ff;
        ">Loading OpenCV…</p>
        <div id="stats" style="
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        ">
          <div>
            <span class="stat-label" style="
              font-size: 12px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #8f9bb9;
              margin-bottom: 2px;
              display: block;
            ">Position</span>
            <span class="stat-value" id="posDisplay" style="
              font-variant-numeric: tabular-nums;
              font-size: 15px;
              color: #e8f1ff;
            ">–, –</span>
          </div>
          <div>
            <span class="stat-label" style="
              font-size: 12px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #8f9bb9;
              margin-bottom: 2px;
              display: block;
            ">Best HSV</span>
            <span class="stat-value" id="paramDisplay" style="
              font-variant-numeric: tabular-nums;
              font-size: 15px;
              color: #e8f1ff;
            ">–</span>
          </div>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-hMin" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">H Min</label>
          <input id="slider-hMin" type="range" min="0" max="179" value="0" style="flex: 1;">
          <span id="value-hMin" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">0</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-hMax" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">H Max</label>
          <input id="slider-hMax" type="range" min="0" max="179" value="179" style="flex: 1;">
          <span id="value-hMax" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">179</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-sMin" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">S Min</label>
          <input id="slider-sMin" type="range" min="0" max="255" value="0" style="flex: 1;">
          <span id="value-sMin" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">0</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-sMax" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">S Max</label>
          <input id="slider-sMax" type="range" min="0" max="255" value="255" style="flex: 1;">
          <span id="value-sMax" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">255</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-vMin" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">V Min</label>
          <input id="slider-vMin" type="range" min="0" max="255" value="0" style="flex: 1;">
          <span id="value-vMin" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">0</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-vMax" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">V Max</label>
          <input id="slider-vMax" type="range" min="0" max="255" value="255" style="flex: 1;">
          <span id="value-vMax" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">255</span>
        </div>
        <div class="slider-row" style="
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        ">
          <label for="slider-bright" style="
            width: 64px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #8f9bb9;
          ">Bright</label>
          <input id="slider-bright" type="range" min="-100" max="100" value="0" style="flex: 1;">
          <span id="value-bright" style="
            width: 46px;
            text-align: right;
            font-variant-numeric: tabular-nums;
            color: #e8f1ff;
          ">0</span>
        </div>
        <button id="startBtn" style="
          width: 100%;
          padding: 10px 14px;
          margin-top: 4px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #2f7bff, #58c6ff);
          color: #fff;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        ">Start Camera</button>
      </div>
    `;

    // Add the HTML to the document
    document.body.insertAdjacentHTML('beforeend', controlsHTML);
  }

  private createBackButton() {
    const buttonWidth = 150;
    const buttonHeight = 50;
    
    const backButton = this.add.container(100, 50);
    
    // Create gray back button background
    const bg = this.add.graphics();
    bg.fillStyle(0x666666, 0.8);
    bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    bg.lineStyle(2, 0x888888, 1);
    bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    
    // Create back button text
    const text = this.add.text(0, 0, 'BACK', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0.5);
    
    backButton.add([bg, text]);
    backButton.setSize(buttonWidth, buttonHeight);
    backButton.setDepth(5);
    
    // Add hover effects
    backButton.setInteractive();
    backButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x777777, 0.9);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, 0x999999, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    });
    
    backButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x666666, 0.8);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, 0x888888, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    });
    
    backButton.on('pointerdown', () => {
      this.cleanup();
      this.scene.start('Settings');
    });
  }

  private cleanup() {
    // Remove the HTML controls when leaving the scene
    const controls = document.getElementById('controls');
    if (controls) {
      controls.remove();
    }
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
      addPoint(x, y, 1);
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
