import { VisionTuner, TrackedBall } from "../tracking";
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
  private domBallList?: HTMLElement;
  private hueTolSlider?: HTMLInputElement;
  private hueTolValue?: HTMLElement;
  private clearBtn?: HTMLButtonElement;
  private cameraStarted = false;
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
    this.domBallList = document.getElementById("ballList") ?? undefined;
    this.hueTolSlider = document.getElementById("slider-hTol") as HTMLInputElement | null ?? undefined;
    this.hueTolValue = document.getElementById("value-hTol") ?? undefined;
    this.clearBtn = document.getElementById("clearBtn") as HTMLButtonElement | null ?? undefined;

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

    this.hueTolSlider?.addEventListener("input", () => {
      const deg = Number(this.hueTolSlider!.value);
      this.vis.setHueTolerance(deg);
      if (this.hueTolValue) this.hueTolValue.textContent = `${deg}°`;
    });
    if (this.hueTolSlider && this.hueTolValue) {
      const current = this.vis.getHueTolerance();
      this.hueTolSlider.value = String(current);
      this.hueTolValue.textContent = `${current}°`;
    }

    this.clearBtn?.addEventListener("click", () => {
      this.vis.clearBalls();
      this.renderBallList([]);
      if (this.domParams) this.domParams.textContent = "–";
      if (this.domPos) this.domPos.textContent = "–, –";
    });

    // Create back button
    this.createBackButton();
  }

  private createHTMLControls() {
    if (document.getElementById("controls")) return;

    const container = document.createElement("div");
    container.id = "controls";
    Object.assign(container.style, {
      position: "fixed",
      top: "18px",
      left: "18px",
      width: "300px",
      padding: "18px 20px",
      borderRadius: "16px",
      border: "1px solid rgba(255, 255, 255, 0.07)",
      background: "rgba(9, 12, 22, 0.88)",
      backdropFilter: "blur(18px)",
      boxShadow: "0 18px 48px rgba(0, 0, 0, 0.45)",
      zIndex: "1000",
      color: "#f0f3ff",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    } as CSSStyleDeclaration);

    container.innerHTML = `
      <h1 style="margin:0 0 12px;font-size:17px;letter-spacing:0.08em;text-transform:uppercase;color:#7da9ff;">Ball Tracker</h1>
      <p id="status" style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#b7c5ff;">Loading OpenCV…</p>
      <div id="stats" style="display:grid;gap:10px;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,0.05);border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
        <div>
          <span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8f9bb9;margin-bottom:2px;display:block;">Position</span>
          <span id="posDisplay" style="font-variant-numeric:tabular-nums;font-size:15px;color:#e8f1ff;">–, –</span>
        </div>
        <div>
          <span style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8f9bb9;margin-bottom:2px;display:block;">HSV Window</span>
          <span id="paramDisplay" style="font-variant-numeric:tabular-nums;font-size:15px;color:#e8f1ff;">–</span>
        </div>
      </div>
      <div id="hueControl" style="margin-bottom:12px;">
        <label for="slider-hTol" style="display:block;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8f9bb9;margin-bottom:4px;">Hue Tolerance<span id="value-hTol" style="margin-left:6px;font-size:13px;color:#e8f1ff;">16°</span></label>
        <input id="slider-hTol" type="range" min="4" max="40" value="16" style="width:100%;">
      </div>
      <div id="ballList" style="margin-bottom:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.05);font-size:13px;line-height:1.5;color:#dbe6ff;">No balls registered</div>
      <button id="startBtn" style="width:100%;padding:10px 14px;margin-top:6px;border:none;border-radius:10px;background:linear-gradient(135deg,#2f7bff,#58c6ff);color:#fff;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:transform 0.2s ease, opacity 0.2s ease;">Start Camera</button>
      <button id="clearBtn" style="width:100%;padding:10px 14px;margin-top:6px;border:none;border-radius:10px;background:rgba(255,82,82,0.9);color:#fff;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:transform 0.2s ease, opacity 0.2s ease;">Clear Balls</button>
    `;

    document.body.appendChild(container);
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

    const balls = this.vis.getTrackedBalls();
    this.renderBallList(balls);

    const rawTex = this.textures.get("raw") as Phaser.Textures.CanvasTexture;
    const maskTex = this.textures.get("mask") as Phaser.Textures.CanvasTexture;
    rawTex.context.drawImage(this.vis.rawCanvas, 0, 0);
    maskTex.context.drawImage(this.vis.maskCanvas, 0, 0);
    rawTex.refresh();
    maskTex.refresh();

    // Draw overlay crosshair on left view
    this.overlay.clear();
    if (balls.length) {
      balls.forEach((ball, index) => {
        if (ball.x === null || ball.y === null || ball.radius === null) return;
        const color = index === 0 ? 0x00ff73 : 0xffa726;
        const radius = Math.max(10, ball.radius);
        this.overlay.lineStyle(2, color, 1);
        this.overlay.strokeCircle(ball.x, ball.y, radius + 6);
        this.overlay.lineBetween(ball.x - 20, ball.y, ball.x + 20, ball.y);
        this.overlay.lineBetween(ball.x, ball.y - 20, ball.x, ball.y + 20);
      });

      const primary = balls[0];
      if (primary.x !== null && primary.y !== null) {
        const message = `x: ${Math.round(primary.x)}, y: ${Math.round(primary.y)}`;
        this.posText.setText(message);
        if (this.domPos) this.domPos.textContent = message;
        addPoint(primary.x, primary.y, 1);
      }
    } else {
      this.posText.setText("x: –, y: –");
      if (this.domPos) this.domPos.textContent = "–, –";
    }

    const primary = this.vis.primaryParams;
    if (primary) {
      const p = primary;
      const text = `HSV: H[${p.hMin}-${p.hMax}], S[${p.sMin}-${p.sMax}], V[${p.vMin}-${p.vMax}]`;
      this.hsvText.setText(text);
      if (this.domParams) this.domParams.textContent = text;
    } else {
      this.hsvText.setText("HSV: –, –, –");
      if (this.domParams) this.domParams.textContent = "–";
    }

    if (this.domStatus && this.cameraStarted) {
      this.domStatus.textContent = balls.length
        ? "Tracking. Cover the camera again to register another ball."
        : "Waiting for auto-calibration… cover the camera with the glowing ball.";
    }
  }

  private renderBallList(balls: TrackedBall[]) {
    if (!this.domBallList) return;
    if (!balls.length) {
      this.domBallList.innerHTML = "No balls registered";
      return;
    }
    this.domBallList.innerHTML = balls.map((ball, idx) => {
      const pos = ball.x !== null && ball.y !== null
        ? `${Math.round(ball.x)}, ${Math.round(ball.y)}`
        : "not visible";
      return `Ball ${idx + 1}: ${pos} (H≈${Math.round(ball.centerHue)}°)`;
    }).join("<br>");
  }
}
