// src/tracking/calibration.ts
import type { SweepParams } from "./types";

const SAT_RANGE: [number, number] = [190, 255];
const VAL_RANGE: [number, number] = [210, 255];
const HUE_UNIFORM_TOL = 12;   // degrees
const SAT_UNIFORM_TOL = 35;
const MIN_VALUE_FOR_CALIBRATION = 80;

export type CalibratedBall = {
  id: number;
  centerHue: number;
  params: SweepParams;
};

export class CalibrationManager {
  private balls: CalibratedBall[] = [];
  private uniformStreak = 0;
  private uniformSample: [number, number, number] | null = null;
  private nextBallId = 1;
  private replaceIndex = 0;
  private hueTolerance: number;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly maxBalls: number,
    initialHueTolerance: number
  ) {
    this.hueTolerance = initialHueTolerance;
  }

  public processFrame(hsvMat: any): CalibratedBall | null {
    const uniform = this.sampleUniformColor(hsvMat);
    if (uniform) {
      this.uniformStreak += 1;
      this.uniformSample = uniform;
    } else {
      this.uniformStreak = 0;
      this.uniformSample = null;
    }

    if (this.uniformSample && this.uniformStreak >= 10) {
      const ball = this.registerBall(this.uniformSample);
      this.uniformStreak = 0;
      this.uniformSample = null;
      return ball;
    }

    return null;
  }

  public clearBalls() {
    this.balls = [];
    this.uniformStreak = 0;
    this.uniformSample = null;
    this.nextBallId = 1;
    this.replaceIndex = 0;
  }

  public getBalls(): CalibratedBall[] {
    return this.balls.map((ball) => ({
      id: ball.id,
      centerHue: ball.centerHue,
      params: { ...ball.params }
    }));
  }

  public setHueTolerance(degrees: number) {
    const tol = clamp(Math.round(degrees), 4, 60);
    this.hueTolerance = tol;
    this.rebuildParams();
  }

  public getHueTolerance() {
    return this.hueTolerance;
  }

  private registerBall(sample: [number, number, number]): CalibratedBall {
    const [hAvg] = sample;

    // Refresh ball with similar hue if one exists.
    const existing = this.balls.find((ball) => hueDistance(ball.centerHue, hAvg) < 4);
    if (existing) {
      existing.centerHue = normalizeHue(hAvg);
      existing.params = this.buildParams(existing.centerHue);
      return existing;
    }

    const newBall: CalibratedBall = {
      id: this.nextBallId++,
      centerHue: normalizeHue(hAvg),
      params: this.buildParams(normalizeHue(hAvg))
    };

    if (this.balls.length < this.maxBalls) {
      this.balls.push(newBall);
    } else {
      this.balls[this.replaceIndex] = newBall;
      this.replaceIndex = (this.replaceIndex + 1) % this.maxBalls;
    }

    return newBall;
  }

  private rebuildParams() {
    this.balls = this.balls.map((ball) => ({
      ...ball,
      params: this.buildParams(ball.centerHue)
    }));
  }

  private buildParams(centerHue: number): SweepParams {
    const tol = this.hueTolerance;
    const hMin = clamp(Math.round(centerHue - tol), 0, 179);
    const hMax = clamp(Math.round(centerHue + tol), 0, 179);
    return {
      hMin,
      hMax,
      sMin: SAT_RANGE[0],
      sMax: SAT_RANGE[1],
      vMin: VAL_RANGE[0],
      vMax: VAL_RANGE[1]
    };
  }

  private sampleUniformColor(hsvMat: any): [number, number, number] | null {
    const probes: Array<[number, number]> = [
      [Math.floor(this.width * 0.2), Math.floor(this.height * 0.2)],
      [Math.floor(this.width * 0.8), Math.floor(this.height * 0.2)],
      [Math.floor(this.width * 0.2), Math.floor(this.height * 0.8)],
      [Math.floor(this.width * 0.8), Math.floor(this.height * 0.8)],
      [Math.floor(this.width * 0.5), Math.floor(this.height * 0.5)]
    ];

    const samples: Array<[number, number, number]> = [];
    for (const [px, py] of probes) {
      const x = clamp(px, 0, this.width - 1);
      const y = clamp(py, 0, this.height - 1);
      const ptr = hsvMat.ucharPtr(y, x);
      if (!ptr) return null;
      samples.push([ptr[0], ptr[1], ptr[2]]);
    }

    let hSumX = 0;
    let hSumY = 0;
    let sSum = 0;
    let vSum = 0;

    for (const [h, s, v] of samples) {
      const radians = (h * Math.PI) / 90; // hue range 0-179 -> 0-2π
      hSumX += Math.cos(radians);
      hSumY += Math.sin(radians);
      sSum += s;
      vSum += v;
      if (v < MIN_VALUE_FOR_CALIBRATION) return null;
    }

    const count = samples.length;
    const hAvg = ((Math.atan2(hSumY, hSumX) * 90) / Math.PI + 360) % 180;
    const sAvg = sSum / count;
    const vAvg = vSum / count;

    for (const [h, s] of samples) {
      if (hueDistance(h, hAvg) > HUE_UNIFORM_TOL) return null;
      if (Math.abs(s - sAvg) > SAT_UNIFORM_TOL) return null;
    }

    return [hAvg, sAvg, vAvg];
  }
}

function hueDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, 180 - diff);
}

function normalizeHue(h: number) {
  let hue = h % 180;
  if (hue < 0) hue += 180;
  return hue;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
