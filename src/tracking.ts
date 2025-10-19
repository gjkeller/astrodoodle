// src/tracking.ts
import { CalibrationManager } from "./tracking/calibration";
import { BallTrackerEngine } from "./tracking/ball-tracker";
import type { SweepParams, TrackedBall } from "./tracking/types";

declare const cv: any;

const MAX_BALLS = 2;
const INITIAL_HUE_TOLERANCE = 24;
export type { SweepParams, TrackedBall } from "./tracking/types";

export class VisionTuner {
  // DOM/video
  private video: HTMLVideoElement;
  private stream?: MediaStream;

  // Offscreen processing canvases
  public rawCanvas: HTMLCanvasElement;
  public maskCanvas: HTMLCanvasElement;

  private rawCtx: CanvasRenderingContext2D;
  private maskCtx: CanvasRenderingContext2D;

  // OpenCV Mats per frame
  private src!: any;
  private bgr!: any;
  private hsv!: any;

  private tracker: BallTrackerEngine | null = null;
  private calibrator: CalibrationManager;

  // Tracking outputs
  private trackedBalls: TrackedBall[] = [];
  public primaryX: number | null = null;
  public primaryY: number | null = null;
  public primaryRadius: number | null = null;
  public primaryParams: SweepParams | null = null;

  // Frame throttling / FPS monitor
  private readonly targetFrameMs = 1000 / 30;
  private lastProcessTime = 0;
  private fpsWindowStart = performance.now();
  private processedFrames = 0;
  private lowFpsAlertShown = false;

  // OpenCV readiness
  private cvReady = false;
  private started = false;
  private cvReadyPromise: Promise<void>;

  constructor(private W = 640, private H = 480) {
    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "true");
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.width = this.W;
    this.video.height = this.H;
    this.video.style.display = "none";
    document.body.appendChild(this.video);

    this.rawCanvas = document.createElement("canvas");
    this.rawCanvas.width = this.W;
    this.rawCanvas.height = this.H;

    this.maskCanvas = document.createElement("canvas");
    this.maskCanvas.width = this.W;
    this.maskCanvas.height = this.H;

    const rawCtx = this.rawCanvas.getContext("2d");
    const maskCtx = this.maskCanvas.getContext("2d");
    if (!rawCtx || !maskCtx) throw new Error("Canvas 2D unavailable");
    this.rawCtx = rawCtx;
    this.maskCtx = maskCtx;

    this.calibrator = new CalibrationManager(this.W, this.H, MAX_BALLS, INITIAL_HUE_TOLERANCE);

    // Wait until the OpenCV runtime is available.
    this.cvReadyPromise = new Promise<void>((resolve) => {
      const tick = () => {
        const runtime = (window as any).cv;
        if (runtime && typeof runtime.Mat === "function") {
          this.cvReady = true;
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  public whenReady() {
    return this.cvReadyPromise;
  }

  public async startCamera() {
    await this.cvReadyPromise;
    if (this.started) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: this.W, height: this.H, facingMode: "user" },
      audio: false
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.src = new cv.Mat(this.H, this.W, cv.CV_8UC4);
    this.bgr = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.hsv = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.tracker = new BallTrackerEngine(this.W, this.H);

    this.started = true;
  }

  public update(): boolean {
    if (!this.started || !this.cvReady || !this.tracker) return false;

    const now = performance.now();
    if (this.lastProcessTime && now - this.lastProcessTime < this.targetFrameMs) {
      return false;
    }
    this.lastProcessTime = now;

    this.rawCtx.save();
    this.rawCtx.scale(-1, 1);
    this.rawCtx.drawImage(this.video, -this.W, 0, this.W, this.H);
    this.rawCtx.restore();

    const imgData = this.rawCtx.getImageData(0, 0, this.W, this.H);
    this.src.data.set(imgData.data);

    cv.cvtColor(this.src, this.bgr, cv.COLOR_RGBA2BGR);
    cv.cvtColor(this.bgr, this.hsv, cv.COLOR_BGR2HSV);

    this.calibrator.processFrame(this.hsv);

    const balls = this.calibrator.getBalls();
    this.trackedBalls = this.tracker.trackBalls(this.hsv, balls);

    this.primaryX = null;
    this.primaryY = null;
    this.primaryRadius = null;
    this.primaryParams = null;

    for (const ball of this.trackedBalls) {
      if (ball.x !== null && ball.y !== null && ball.radius !== null) {
        this.primaryX = ball.x;
        this.primaryY = ball.y;
        this.primaryRadius = ball.radius;
        this.primaryParams = { ...ball.params };
        break;
      }
    }

    const maskMat = this.tracker.getMask();
    const show = new cv.Mat();
    cv.cvtColor(maskMat, show, cv.COLOR_GRAY2RGBA);
    const outImg = new ImageData(new Uint8ClampedArray(show.data), this.W, this.H);
    this.maskCtx.putImageData(outImg, 0, 0);
    show.delete();

    this.processedFrames += 1;
    const windowElapsed = now - this.fpsWindowStart;
    if (windowElapsed >= 1000) {
      const fps = (this.processedFrames * 1000) / windowElapsed;
      if (fps < 30 && !this.lowFpsAlertShown) {
        console.warn("OpenCV processing below 30 FPS");
        this.lowFpsAlertShown = true;
      }
      this.processedFrames = 0;
      this.fpsWindowStart = now;
    }

    return true;
  }

  public getTrackedBalls(): TrackedBall[] {
    return this.trackedBalls.map((ball) => ({
      ...ball,
      params: { ...ball.params }
    }));
  }

  public setHueTolerance(degrees: number) {
    this.calibrator.setHueTolerance(degrees);
  }

  public getHueTolerance() {
    return this.calibrator.getHueTolerance();
  }

  public clearBalls() {
    this.calibrator.clearBalls();
    this.trackedBalls = [];
    this.primaryX = null;
    this.primaryY = null;
    this.primaryRadius = null;
    this.primaryParams = null;
    if (this.tracker) {
      this.tracker.getMask().setTo(new cv.Scalar(0));
    }
  }
}
