import { detectAllPlayers, playerMap, deletePlayer, addPoint } from "./gesture/tracker";
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
	const { results: allResults, elapsedMs } = detectAllPlayers();

	drawPlayer1Points();

	for (const [playerKey, detections] of Object.entries(allResults)) {
		if (!detections || detections.length === 0) {
			continue;
		}
		const validDetections = detections.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
		if (validDetections.length === 0) {
			continue;
		}
		const playerId = Number(playerKey);
		console.log('detectAllPlayers', playerId, validDetections, elapsedMs);
		const maxResult = validDetections.reduce((best, current) => current.Score > best.Score ? current : best);
		console.log('bestDetection', playerId, maxResult);
		if (maxResult.Score > 0.12) {
			deletePlayer(playerId);
			console.log('playerRemoved', playerId, maxResult.Score);
		}
	}
}, 100);
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
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  width: 640 * 2 + 16,
  height: 480,
  scene: [SweepScene]
});
