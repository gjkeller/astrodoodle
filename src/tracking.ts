// src/tracking.ts
// Tell TypeScript about the global OpenCV symbol that ships with opencv.js.
declare const cv: any;

export type SweepParams = {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
};

export type TrackedBall = {
  id: number;
  centerHue: number;
  params: SweepParams;
  x: number | null;
  y: number | null;
  radius: number | null;
  coverage: number;
};

type SweepResult = {
  cx: number;
  cy: number;
  radius: number;
  coverage: number;
  score: number;
};

type Mode = "idle" | "locked";

const SAT_RANGE: [number, number] = [190, 255];
const VAL_RANGE: [number, number] = [210, 255];
const MAX_BALLS = 2;
const UNIFORM_FRAMES_REQUIRED = 10;

export class VisionTuner {
  // DOM/video
  private video: HTMLVideoElement;
  private stream?: MediaStream;

  // Offscreen processing canvases
  public rawCanvas: HTMLCanvasElement;
  public maskCanvas: HTMLCanvasElement;

  private rawCtx: CanvasRenderingContext2D;
  private maskCtx: CanvasRenderingContext2D;

  // OpenCV Mats (reused each frame)
  private src!: any;          // RGBA
  private bgr!: any;          // BGR
  private hsv!: any;          // HSV
  private mask!: any;         // combined mask rendered for display
  private tempMask!: any;     // per-ball mask scratch
  private workMask!: any;     // contour scratch
  private contours!: any;
  private hierarchy!: any;
  private kernel!: any;

  // Tracking state
  private mode: Mode = "idle";
  private uniformStreak = 0;
  private uniformSample: [number, number, number] | null = null;
  private hueTolerance = 16; // degrees
  private balls: TrackedBall[] = [];
  private nextBallId = 1;

  // Convenience exports for legacy consumers
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

    // Allocate OpenCV Mats once.
    this.src = new cv.Mat(this.H, this.W, cv.CV_8UC4);
    this.bgr = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.hsv = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.mask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.tempMask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.workMask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.contours = new cv.MatVector();
    this.hierarchy = new cv.Mat();
    this.kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));

    this.started = true;
  }

  public update(): boolean {
    if (!this.started || !this.cvReady) return false;

    const now = performance.now();
    if (this.lastProcessTime && now - this.lastProcessTime < this.targetFrameMs) {
      return false;
    }
    this.lastProcessTime = now;

    // Mirror the video feed into the raw canvas.
    this.rawCtx.save();
    this.rawCtx.scale(-1, 1);
    this.rawCtx.drawImage(this.video, -this.W, 0, this.W, this.H);
    this.rawCtx.restore();

    const imgData = this.rawCtx.getImageData(0, 0, this.W, this.H);
    this.src.data.set(imgData.data);

    cv.cvtColor(this.src, this.bgr, cv.COLOR_RGBA2BGR);
    cv.cvtColor(this.bgr, this.hsv, cv.COLOR_BGR2HSV);

    // Check for a uniform frame to register a new ball.
    const uniform = this.sampleUniformColor();
    if (uniform) {
      this.uniformStreak += 1;
      this.uniformSample = uniform;
    } else {
      this.uniformStreak = 0;
      this.uniformSample = null;
    }

    if (this.uniformSample && this.uniformStreak >= UNIFORM_FRAMES_REQUIRED) {
      this.registerBall(this.uniformSample);
      this.uniformStreak = 0;
      this.uniformSample = null;
    }

    // Reset the display mask before we accumulate per-ball masks.
    this.mask.setTo(new cv.Scalar(0));

    this.primaryX = null;
    this.primaryY = null;
    this.primaryRadius = null;
    this.primaryParams = null;

    for (const ball of this.balls) {
      const params = this.buildParams(ball.centerHue);
      ball.params = params;
      const result = this.evaluateBall(params);

      if (result) {
        ball.x = result.cx;
        ball.y = result.cy;
        ball.radius = result.radius;
        ball.coverage = result.coverage;

        if (this.primaryX === null) {
          this.primaryX = result.cx;
          this.primaryY = result.cy;
          this.primaryRadius = result.radius;
          this.primaryParams = { ...params };
        }
      } else {
        ball.x = null;
        ball.y = null;
        ball.radius = null;
        ball.coverage = 0;
      }
    }

    // Push the accumulated mask to the Phaser texture.
    const show = new cv.Mat();
    cv.cvtColor(this.mask, show, cv.COLOR_GRAY2RGBA);
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

  private evaluateBall(params: SweepParams): SweepResult | null {
    const low = new cv.Mat(this.H, this.W, this.hsv.type(), [params.hMin, params.sMin, params.vMin, 0]);
    const high = new cv.Mat(this.H, this.W, this.hsv.type(), [params.hMax, params.sMax, params.vMax, 255]);
    cv.inRange(this.hsv, low, high, this.tempMask);
    low.delete();
    high.delete();

    cv.morphologyEx(this.tempMask, this.tempMask, cv.MORPH_OPEN, this.kernel, new cv.Point(-1, -1), 1);
    cv.dilate(this.tempMask, this.tempMask, this.kernel, new cv.Point(-1, -1), 1);
    cv.GaussianBlur(this.tempMask, this.tempMask, new cv.Size(7, 7), 0, 0);

    // Accumulate into the display mask.
    cv.bitwise_or(this.mask, this.tempMask, this.mask);

    this.tempMask.copyTo(this.workMask);
    cv.findContours(this.workMask, this.contours, this.hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestScore = 0;
    let bestResult: SweepResult | null = null;
    const coverage = cv.countNonZero(this.tempMask) / (this.W * this.H);

    for (let i = 0; i < this.contours.size(); i++) {
      const cnt = this.contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < 80) {
        cnt.delete();
        continue;
      }
      const perimeter = cv.arcLength(cnt, true);
      if (perimeter <= 0) {
        cnt.delete();
        continue;
      }
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
      if (circularity < 0.5) {
        cnt.delete();
        continue;
      }
      const moments = cv.moments(cnt);
      if (!moments.m00) {
        cnt.delete();
        continue;
      }

      const cx = moments.m10 / moments.m00;
      const cy = moments.m01 / moments.m00;
      const radius = Math.sqrt(area / Math.PI);
      const score = area * circularity;
      if (score > bestScore) {
        bestResult = { score, cx, cy, radius, coverage };
        bestScore = score;
      }
      cnt.delete();
    }

    if (!bestResult && coverage > 0.02) {
      bestResult = {
        score: coverage,
        cx: this.W / 2,
        cy: this.H / 2,
        radius: Math.sqrt((coverage * this.W * this.H) / Math.PI),
        coverage
      };
    }

    return bestResult;
  }

  private sampleUniformColor(): [number, number, number] | null {
    const probes: Array<[number, number]> = [
      [Math.floor(this.W * 0.2), Math.floor(this.H * 0.2)],
      [Math.floor(this.W * 0.8), Math.floor(this.H * 0.2)],
      [Math.floor(this.W * 0.2), Math.floor(this.H * 0.8)],
      [Math.floor(this.W * 0.8), Math.floor(this.H * 0.8)],
      [Math.floor(this.W * 0.5), Math.floor(this.H * 0.5)]
    ];

    const samples: Array<[number, number, number]> = [];
    for (const [px, py] of probes) {
      const ptr = this.hsv.ucharPtr(this.clamp(py, 0, this.H - 1), this.clamp(px, 0, this.W - 1));
      if (!ptr) return null;
      samples.push([ptr[0], ptr[1], ptr[2]]);
    }

    let hSum = 0;
    let sSum = 0;
    let vSum = 0;
    for (const [h, s, v] of samples) {
      hSum += h;
      sSum += s;
      vSum += v;
    }
    const count = samples.length;
    const hAvg = hSum / count;
    const sAvg = sSum / count;
    const vAvg = vSum / count;

    if (vAvg < 60 || sAvg < 35) return null;

    const hTol = 6;
    const svTol = 8;
    for (const [h, s, v] of samples) {
      if (Math.abs(h - hAvg) > hTol) return null;
      if (Math.abs(s - sAvg) > svTol) return null;
      if (Math.abs(v - vAvg) > svTol) return null;
    }

    return [hAvg, sAvg, vAvg];
  }

  private registerBall(sample: [number, number, number]) {
    const [hAvg] = sample;

    // If a ball with a close hue already exists, refresh it.
    const existing = this.balls.find((b) => Math.abs(b.centerHue - hAvg) < 4);
    if (existing) {
      existing.centerHue = hAvg;
      existing.params = this.buildParams(hAvg);
      existing.coverage = 0;
      existing.x = null;
      existing.y = null;
      existing.radius = null;
      this.mode = "locked";
      return;
    }

    const ball: TrackedBall = {
      id: this.nextBallId++,
      centerHue: hAvg,
      params: this.buildParams(hAvg),
      x: null,
      y: null,
      radius: null,
      coverage: 0
    };

    if (this.balls.length < MAX_BALLS) {
      this.balls.push(ball);
    } else {
      // Replace the least reliable ball (lowest coverage).
      let weakest = 0;
      for (let i = 1; i < this.balls.length; i++) {
        if (this.balls[i].coverage < this.balls[weakest].coverage) weakest = i;
      }
      this.balls[weakest] = ball;
    }

    this.mode = "locked";
  }

  private buildParams(centerHue: number): SweepParams {
    const tol = this.hueTolerance;
    const hMin = this.clamp(Math.round(centerHue - tol), 0, 179);
    const hMax = this.clamp(Math.round(centerHue + tol), 0, 179);
    return {
      hMin,
      hMax,
      sMin: SAT_RANGE[0],
      sMax: SAT_RANGE[1],
      vMin: VAL_RANGE[0],
      vMax: VAL_RANGE[1]
    };
  }

  public setHueTolerance(degrees: number) {
    const clamped = this.clamp(Math.round(degrees), 4, 60);
    if (clamped === this.hueTolerance) return;
    this.hueTolerance = clamped;
    for (const ball of this.balls) {
      ball.params = this.buildParams(ball.centerHue);
    }
  }

  public getHueTolerance() {
    return this.hueTolerance;
  }

  public clearBalls() {
    this.balls = [];
    this.mode = "idle";
    this.primaryX = null;
    this.primaryY = null;
    this.primaryRadius = null;
    this.primaryParams = null;
  }

  public getTrackedBalls(): TrackedBall[] {
    return this.balls.map((ball) => ({ ...ball, params: { ...ball.params } }));
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}
