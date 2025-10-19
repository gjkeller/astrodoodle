// src/tracking.ts
// Tell TS about the global OpenCV symbol.
declare const cv: any;

export type SweepParams = {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
};

type SweepResult = {
  mask: any;
  params: SweepParams;
  score: number;
  cx: number;
  cy: number;
  radius: number;
  coverage: number;
};

type Mode = "idle" | "locked";

export class VisionTuner {
  // DOM/video
  private video: HTMLVideoElement;
  private stream?: MediaStream;

  // Offscreen processing canvases
  public rawCanvas: HTMLCanvasElement;
  public maskCanvas: HTMLCanvasElement;

  private rawCtx: CanvasRenderingContext2D;
  private maskCtx: CanvasRenderingContext2D;

  // OpenCV Mats
  private src!: any;          // RGBA
  private bgr!: any;          // BGR
  private hsv!: any;          // HSV
  private mask!: any;         // 8U mask (display)
  private tempMask!: any;     // sweep scratch
  private workMask!: any;     // contour scratch
  private bestMask!: any;     // winning mask copy
  private brightMat!: any;    // for brightness addWeighted
  private contours!: any;
  private hierarchy!: any;
  private kernel!: any;

  // Ball position
  public x: number | null = null;
  public y: number | null = null;
  public radius: number | null = null;
  public bestParams: SweepParams | null = null;
  public lockedParams: SweepParams | null = null;

  // Config
  private W = 640;
  private H = 480;

  private cvReady = false;
  private started = false;
  private cvReadyPromise: Promise<void>;
  private mode: Mode = "idle";
  private uniformStreak = 0;
  private uniformSample: [number, number, number] | null = null;
  private historyHue: number[] = [];
  private historySat: number[] = [];
  private historyVal: number[] = [];
  private readonly historySize = 30;
  private adaptiveFramesRemaining = 0;

  constructor(width = 640, height = 480) {
    this.W = width;
    this.H = height;

    this.video = document.createElement("video");
    this.video.setAttribute("playsinline", "true"); // iOS/Safari
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

    const rctx = this.rawCanvas.getContext("2d");
    const mctx = this.maskCanvas.getContext("2d");
    if (!rctx || !mctx) throw new Error("Canvas 2D unavailable");
    this.rawCtx = rctx;
    this.maskCtx = mctx;

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

    // Allocate Mats
    this.src = new cv.Mat(this.H, this.W, cv.CV_8UC4);      // RGBA from canvas
    this.bgr = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.hsv = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.mask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.tempMask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.workMask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.bestMask = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.brightMat = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.contours = new cv.MatVector();
    this.hierarchy = new cv.Mat();
    this.kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));

    this.started = true;
  }

  public update() {
    if (!this.started) return;
    if (!this.cvReady) return;

    // Draw live frame (mirrored for selfie view)
    this.rawCtx.save();
    this.rawCtx.scale(-1, 1);
    this.rawCtx.drawImage(this.video, -this.W, 0, this.W, this.H);
    this.rawCtx.restore();

    // Sync into Mats
    const imgData = this.rawCtx.getImageData(0, 0, this.W, this.H);
    this.src.data.set(imgData.data);

    // Convert RGBA -> BGR -> HSV
    cv.cvtColor(this.src, this.bgr, cv.COLOR_RGBA2BGR);
    this.bgr.copyTo(this.brightMat);
    cv.cvtColor(this.brightMat, this.hsv, cv.COLOR_BGR2HSV);

    // Look for the "lens covered" signal: five probe pixels converging in HSV space.
    const uniformSample = this.sampleUniformColor();
    if (uniformSample) {
      this.uniformStreak += 1;
      this.uniformSample = uniformSample;
    } else {
      this.uniformStreak = 0;
      this.uniformSample = null;
    }

    // After 10 consistent frames, treat the sample as the calibration frame.
    if (this.uniformSample && this.uniformStreak >= 10) {
      this.setLockFromUniformSample(this.uniformSample);
      this.uniformStreak = 0;
      this.uniformSample = null;
    }

    let result: SweepResult | null = null;
    if (this.mode === "locked" && this.lockedParams) {
      result = this.applyParams(this.lockedParams);
    }

    if (result) {
      this.bestParams = { ...this.lockedParams! };
      this.x = result.cx;
      this.y = result.cy;
      this.radius = result.radius;
      result.mask.copyTo(this.mask);
      if (this.adaptiveFramesRemaining > 0) {
        this.updateHistoryFromMask(result.mask);
        this.lockedParams = { ...this.refineParamsFromHistory(this.lockedParams!) };
        this.bestParams = { ...this.lockedParams };
        this.adaptiveFramesRemaining -= 1;
      }
    } else {
      this.x = null;
      this.y = null;
      this.radius = null;
      if (this.mode === "locked" && this.lockedParams) {
        this.bestParams = { ...this.lockedParams };
      } else {
        this.bestParams = null;
      }
      this.mask.setTo(new cv.Scalar(0));
    }

    const show = new cv.Mat();
    cv.cvtColor(this.mask, show, cv.COLOR_GRAY2RGBA);
    const outImgData = new ImageData(new Uint8ClampedArray(show.data), this.W, this.H);
    this.maskCtx.putImageData(outImgData, 0, 0);
    show.delete();
  }

  private applyParams(params: SweepParams): SweepResult | null {
    // Build a binary mask from the HSV limits and grade the best contour.
    const low = new cv.Mat(this.H, this.W, this.hsv.type(), [params.hMin, params.sMin, params.vMin, 0]);
    const high = new cv.Mat(this.H, this.W, this.hsv.type(), [params.hMax, params.sMax, params.vMax, 255]);

    cv.inRange(this.hsv, low, high, this.tempMask);
    low.delete();
    high.delete();

    cv.morphologyEx(this.tempMask, this.tempMask, cv.MORPH_OPEN, this.kernel, new cv.Point(-1, -1), 1);
    cv.dilate(this.tempMask, this.tempMask, this.kernel, new cv.Point(-1, -1), 1);
    cv.GaussianBlur(this.tempMask, this.tempMask, new cv.Size(7, 7), 0, 0);

    this.tempMask.copyTo(this.workMask);
    cv.findContours(this.workMask, this.contours, this.hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestScore = 0;
    let best: SweepResult | null = null;
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
        this.tempMask.copyTo(this.bestMask);
        bestScore = score;
        best = {
          mask: this.bestMask,
          params,
          score,
          cx,
          cy,
          radius,
          coverage
        };
      }
      cnt.delete();
    }

    if (!best && coverage > 0) {
      this.tempMask.copyTo(this.bestMask);
      const estimatedRadius = Math.sqrt((coverage * this.W * this.H) / Math.PI);
      best = {
        mask: this.bestMask,
        params,
        score: coverage,
        cx: this.W / 2,
        cy: this.H / 2,
        radius: estimatedRadius,
        coverage
      };
    }

    return best;
  }

  private sampleUniformColor(): [number, number, number] | null {
    const points: Array<[number, number]> = [
      [Math.floor(this.W * 0.2), Math.floor(this.H * 0.2)],
      [Math.floor(this.W * 0.8), Math.floor(this.H * 0.2)],
      [Math.floor(this.W * 0.2), Math.floor(this.H * 0.8)],
      [Math.floor(this.W * 0.8), Math.floor(this.H * 0.8)],
      [Math.floor(this.W * 0.5), Math.floor(this.H * 0.5)]
    ];

    const samples: Array<[number, number, number]> = [];
    for (const [px, py] of points) {
      const x = this.clamp(Math.round(px), 0, this.W - 1);
      const y = this.clamp(Math.round(py), 0, this.H - 1);
      const ptr = this.hsv.ucharPtr(y, x);
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

  private setLockFromUniformSample(sample: [number, number, number]) {
    const params = this.buildParams(sample, 1.0);
    const result = this.applyParams(params);
    this.lockedParams = { ...params };
    this.bestParams = { ...params };
    this.mode = "locked";
    this.adaptiveFramesRemaining = 10;
    this.historyHue = [];
    this.historySat = [];
    this.historyVal = [];

    if (result) {
      this.x = result.cx;
      this.y = result.cy;
      this.radius = result.radius;
      result.mask.copyTo(this.mask);
      this.updateHistoryFromMask(result.mask);
    } else {
      this.x = null;
      this.y = null;
      this.radius = null;
      this.mask.setTo(new cv.Scalar(0));
    }
  }

  public unlock() {
    this.mode = "idle";
    this.lockedParams = null;
    this.bestParams = null;
    this.historyHue = [];
    this.historySat = [];
    this.historyVal = [];
    this.adaptiveFramesRemaining = 0;
  }

  public isLocked() {
    return this.mode === "locked" && this.lockedParams !== null;
  }

  private buildParams(sample: [number, number, number], scale: number): SweepParams {
    const [hAvg, sAvg, vAvg] = sample;
    const hueBase = 16;
    const satBaseLow = 60;
    const satBaseHigh = 45;
    const valBaseLow = 45;
    const valBaseHigh = 45;

    const params: SweepParams = {
      hMin: this.clamp(Math.round(hAvg - hueBase * scale) - 10, 0, 179),
      hMax: this.clamp(Math.round(hAvg + hueBase * scale), 0, 179),
      sMin: this.clamp(Math.round(sAvg - satBaseLow * scale), 0, 255),
      sMax: this.clamp(Math.round(sAvg + satBaseHigh * scale), 0, 255),
      // Drop Vmin a touch so the ball stays in range once the camera brightens post-calibration.
      vMin: this.clamp(Math.round(vAvg - valBaseLow * scale) - 10, 0, 255),
      vMax: this.clamp(Math.round(vAvg + valBaseHigh * scale), 0, 255)
    };

    if (params.hMax - params.hMin < 12) {
      const mid = Math.round((params.hMax + params.hMin) / 2);
      params.hMin = this.clamp(mid - 12, 0, 179);
      params.hMax = this.clamp(mid + 12, 0, 179);
    }
    if (params.sMin < 40) params.sMin = 40;
    if (params.vMin < 60) params.vMin = 60;

    return params;
  }

  private clamp(value: number, min: number, max: number) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  // Capture running HSV means from the current mask to smooth early post-lock frames.
  private updateHistoryFromMask(mask: any) {
    if (!mask) return;
    const mean = new cv.Mat();
    const std = new cv.Mat();
    cv.meanStdDev(this.hsv, mean, std, mask);
    const meanData = mean.data64F as Float64Array | undefined;
    const meanVals = meanData ? Array.from(meanData) : [];
    std.delete();
    mean.delete();
    if (meanVals.length < 3) return;
    const [h, s, v] = meanVals;
    this.historyHue.push(h);
    this.historySat.push(s);
    this.historyVal.push(v);
    if (this.historyHue.length > this.historySize) this.historyHue.shift();
    if (this.historySat.length > this.historySize) this.historySat.shift();
    if (this.historyVal.length > this.historySize) this.historyVal.shift();
  }

  // Convert the history window into a slightly widened HSV band.
  private refineParamsFromHistory(current: SweepParams): SweepParams {
    if (!this.historyHue.length) return current;
    const hMean = this.average(this.historyHue);
    const sMean = this.average(this.historySat);
    const vMean = this.average(this.historyVal);
    const hStd = this.stddev(this.historyHue, hMean);
    const sStd = this.stddev(this.historySat, sMean);
    const vStd = this.stddev(this.historyVal, vMean);

    const hTol = Math.max(8, hStd * 4);
    const sTol = Math.max(40, sStd * 4);
    const vTol = Math.max(40, vStd * 4);

    return {
      hMin: this.clamp(Math.round(hMean - hTol), 0, 179),
      hMax: this.clamp(Math.round(hMean + hTol), 0, 179),
      sMin: this.clamp(Math.round(sMean - sTol), 0, 255),
      sMax: this.clamp(Math.round(sMean + sTol), 0, 255),
      vMin: this.clamp(Math.round(vMean - vTol), 0, 255),
      vMax: this.clamp(Math.round(vMean + vTol), 0, 255)
    };
  }

  private average(values: number[]) {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private stddev(values: number[], mean: number) {
    if (values.length <= 1) return 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }
}
