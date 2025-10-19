// src/tracking/calibration.ts
import type { SweepParams } from "./types";

const SAT_RANGE: [number, number] = [190, 255];
const VAL_RANGE: [number, number] = [210, 255];
const HUE_UNIFORM_TOL = 12;   // degrees
const SAT_UNIFORM_TOL = 35;
const MIN_VALUE_FOR_CALIBRATION = 80;
const REQUIRED_UNIFORM_FRAMES = 10;
const PROBE_POSITIONS: Array<[number, number]> = [
  [0.2, 0.2],
  [0.5, 0.2],
  [0.8, 0.2],
  [0.2, 0.5],
  [0.5, 0.5],
  [0.8, 0.5],
  [0.2, 0.8],
  [0.5, 0.8],
  [0.8, 0.8]
];
const NEIGHBOR_RADIUS = 2; // samples a 5x5 window
const SAT_MARGIN = 15;
const VAL_MARGIN = 15;
const HUE_DYNAMIC_MARGIN_MIN = 4;

export type CalibratedBall = {
  id: number;
  centerHue: number;
  params: SweepParams;
};

export type SavedBall = {
  id: number;
  centerHue: number;
  params: SweepParams;
};

type FrameSample = {
  hues: number[];
  sats: number[];
  vals: number[];
  meanHue: number;
  meanSat: number;
  meanVal: number;
};

export class CalibrationManager {
  private balls: CalibratedBall[] = [];
  private uniformFrames: FrameSample[] = [];
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
    const sample = this.sampleUniformColor(hsvMat);
    if (sample) {
      this.uniformFrames.push(sample);
      if (this.uniformFrames.length >= REQUIRED_UNIFORM_FRAMES) {
        const ball = this.registerBallFromFrames(this.uniformFrames);
        this.resetUniformAccumulator();
        return ball;
      }
    } else if (this.uniformFrames.length) {
      this.resetUniformAccumulator();
    }

    return null;
  }

  public clearBalls() {
    this.balls = [];
    this.nextBallId = 1;
    this.replaceIndex = 0;
    this.resetUniformAccumulator();
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

  public loadSavedBalls(saved: SavedBall[]) {
    if (!Array.isArray(saved)) return;
    const limited = saved.slice(0, this.maxBalls);
    this.balls = limited.map((ball) => ({
      id: ball.id,
      centerHue: normalizeHue(ball.centerHue),
      params: sanitizeParams(ball.params)
    }));
    const highestId = this.balls.reduce((max, ball) => Math.max(max, ball.id), 0);
    this.nextBallId = highestId > 0 ? highestId + 1 : 1;
    this.replaceIndex = this.balls.length % Math.max(1, this.maxBalls);
  }

  public addManualBall(params: SweepParams): CalibratedBall {
    const prepared = sanitizeParams(params);
    const centerHue = resolveCenterHue(prepared);
    const newBall: CalibratedBall = {
      id: this.nextBallId++,
      centerHue,
      params: prepared
    };

    if (this.balls.length < this.maxBalls) {
      this.balls.push(newBall);
    } else {
      this.balls[this.replaceIndex] = newBall;
      this.replaceIndex = (this.replaceIndex + 1) % this.maxBalls;
    }

    return newBall;
  }

  public updateBall(id: number, params: SweepParams): CalibratedBall | null {
    const idx = this.balls.findIndex((ball) => ball.id === id);
    if (idx === -1) return null;
    const prepared = sanitizeParams(params);
    const centerHue = resolveCenterHue(prepared);
    this.balls[idx] = {
      ...this.balls[idx],
      centerHue,
      params: prepared
    };
    return this.balls[idx];
  }

  public removeBall(id: number): boolean {
    const idx = this.balls.findIndex((ball) => ball.id === id);
    if (idx === -1) return false;
    this.balls.splice(idx, 1);
    if (this.replaceIndex >= this.balls.length) {
      this.replaceIndex = 0;
    }
    return true;
  }

  public getHueTolerance() {
    return this.hueTolerance;
  }

  private registerBallFromFrames(frames: FrameSample[]): CalibratedBall {
    const aggregate = this.buildAggregateParams(frames);
    const { centerHue, params } = aggregate;
    // Refresh ball with similar hue if one exists.
    const existing = this.balls.find((ball) => hueDistance(ball.centerHue, centerHue) <= 8);
    if (existing) {
      existing.centerHue = centerHue;
      existing.params = params;
      return existing;
    }

    const newBall: CalibratedBall = {
      id: this.nextBallId++,
      centerHue,
      params
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
      params: {
        ...ball.params,
        ...this.buildHueParams(
          ball.centerHue,
          Boolean(ball.params.wrapHue)
        )
      }
    }));
  }

  private buildParams(centerHue: number): SweepParams {
    const hueParams = this.buildHueParams(centerHue, false);
    return {
      ...hueParams,
      sMin: SAT_RANGE[0],
      sMax: SAT_RANGE[1],
      vMin: VAL_RANGE[0],
      vMax: VAL_RANGE[1]
    };
  }

  private buildHueParams(centerHue: number, preferWrap: boolean): Pick<SweepParams, "hMin" | "hMax" | "wrapHue"> {
    const lower = centerHue - this.hueTolerance;
    const upper = centerHue + this.hueTolerance;
    const wrapHue = preferWrap || lower < 0 || upper >= 180;
    if (wrapHue) {
      const hMin = normalizeHue(Math.floor(lower));
      let hMax = normalizeHue(Math.ceil(upper));
      if (hMin === hMax) {
        hMax = (hMax + 1) % 180;
      }
      return {
        hMin,
        hMax,
        wrapHue: true
      };
    }
    const hMin = clamp(Math.floor(lower), 0, 179);
    let hMax = clamp(Math.ceil(upper), 0, 179);
    if (hMax <= hMin) {
      hMax = Math.min(179, hMin + 4);
    }
    return {
      hMin,
      hMax,
      wrapHue: false
    };
  }

  private sampleUniformColor(hsvMat: any): FrameSample | null {
    const samples: Array<[number, number, number]> = [];

    for (const [nx, ny] of PROBE_POSITIONS) {
      const baseX = clamp(Math.round(this.width * nx), 0, this.width - 1);
      const baseY = clamp(Math.round(this.height * ny), 0, this.height - 1);
      let hX = 0;
      let hY = 0;
      let sSum = 0;
      let vSum = 0;
      let count = 0;

      for (let dy = -NEIGHBOR_RADIUS; dy <= NEIGHBOR_RADIUS; dy++) {
        for (let dx = -NEIGHBOR_RADIUS; dx <= NEIGHBOR_RADIUS; dx++) {
          const x = clamp(baseX + dx, 0, this.width - 1);
          const y = clamp(baseY + dy, 0, this.height - 1);
          const ptr = hsvMat.ucharPtr(y, x);
          if (!ptr) continue;
          const h = ptr[0];
          const s = ptr[1];
          const v = ptr[2];
          if (v < MIN_VALUE_FOR_CALIBRATION) return null;

          const radians = (h * Math.PI) / 90;
          hX += Math.cos(radians);
          hY += Math.sin(radians);
          sSum += s;
          vSum += v;
          count += 1;
        }
      }

      if (!count) return null;
      const hue = ((Math.atan2(hY, hX) * 90) / Math.PI + 360) % 180;
      samples.push([hue, sSum / count, vSum / count]);
    }

    if (!samples.length) return null;

    let frameHX = 0;
    let frameHY = 0;
    let frameSat = 0;
    let frameVal = 0;

    for (const [h, s, v] of samples) {
      const radians = (h * Math.PI) / 90;
      frameHX += Math.cos(radians);
      frameHY += Math.sin(radians);
      frameSat += s;
      frameVal += v;
    }

    const count = samples.length;
    const meanHue = ((Math.atan2(frameHY, frameHX) * 90) / Math.PI + 360) % 180;
    const meanSat = frameSat / count;
    const meanVal = frameVal / count;

    for (const [h, s] of samples) {
      if (hueDistance(h, meanHue) > HUE_UNIFORM_TOL) return null;
      if (Math.abs(s - meanSat) > SAT_UNIFORM_TOL) return null;
    }

    return {
      hues: samples.map(([h]) => h),
      sats: samples.map(([, s]) => s),
      vals: samples.map(([, , v]) => v),
      meanHue,
      meanSat,
      meanVal
    };
  }

  private resetUniformAccumulator() {
    this.uniformFrames = [];
  }

  private buildAggregateParams(frames: FrameSample[]): { centerHue: number; params: SweepParams } {
    const hueValues = frames.flatMap((frame) => frame.hues);
    const satValues = frames.flatMap((frame) => frame.sats);
    const valValues = frames.flatMap((frame) => frame.vals);

    if (!hueValues.length || !satValues.length || !valValues.length) {
      const fallbackHue = frames.length ? frames[frames.length - 1].meanHue : 0;
      return {
        centerHue: normalizeHue(fallbackHue),
        params: this.buildParams(normalizeHue(fallbackHue))
      };
    }

    let sumX = 0;
    let sumY = 0;
    for (const h of hueValues) {
      const radians = (h * Math.PI) / 90;
      sumX += Math.cos(radians);
      sumY += Math.sin(radians);
    }

    const centerHue = normalizeHue(((Math.atan2(sumY, sumX) * 90) / Math.PI + 360) % 180);
    const hueDiffs = hueValues.map((h) => signedHueDelta(centerHue, h));
    const minDiff = Math.min(...hueDiffs);
    const maxDiff = Math.max(...hueDiffs);
    const diffRange = maxDiff - minDiff;
    const dynamicMargin = Math.max(HUE_DYNAMIC_MARGIN_MIN, Math.round(diffRange * 0.35));

    const sliderMin = centerHue - this.hueTolerance;
    const sliderMax = centerHue + this.hueTolerance;
    const rawLower = Math.min(centerHue + minDiff - dynamicMargin, sliderMin);
    const rawUpper = Math.max(centerHue + maxDiff + dynamicMargin, sliderMax);
    const wrapHue = rawLower < 0 || rawUpper >= 180;

    let hMin: number;
    let hMax: number;
    if (wrapHue) {
      hMin = normalizeHue(Math.floor(rawLower));
      hMax = normalizeHue(Math.ceil(rawUpper));
      if (hMin === hMax) {
        hMax = (hMax + 1) % 180;
      }
    } else {
      hMin = clamp(Math.floor(rawLower), 0, 179);
      hMax = clamp(Math.ceil(rawUpper), 0, 179);
      if (hMax <= hMin) {
        hMax = Math.min(179, hMin + 4);
      }
    }

    const satMin = clamp(Math.floor(Math.min(...satValues)) - SAT_MARGIN, 0, 255);
    const satMax = clamp(Math.ceil(Math.max(...satValues)) + SAT_MARGIN, 0, 255);
    const valMin = clamp(Math.floor(Math.min(...valValues)) - VAL_MARGIN, 0, 255);
    const valMax = clamp(Math.ceil(Math.max(...valValues)) + VAL_MARGIN, 0, 255);

    const adjustedSat = expandOrFallback(satMin, satMax, SAT_RANGE);
    const adjustedVal = expandOrFallback(valMin, valMax, VAL_RANGE);

    const params: SweepParams = sanitizeParams({
      hMin,
      hMax,
      wrapHue,
      sMin: adjustedSat[0],
      sMax: adjustedSat[1],
      vMin: adjustedVal[0],
      vMax: adjustedVal[1]
    });

    return {
      centerHue,
      params
    };
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

function signedHueDelta(reference: number, value: number) {
  let delta = value - reference;
  if (delta > 90) delta -= 180;
  if (delta < -90) delta += 180;
  return delta;
}

function sanitizeParams(params: SweepParams): SweepParams {
  const rawHMin = Number(params.hMin ?? 0);
  const rawHMax = Number(params.hMax ?? 0);
  let wrapHue = Boolean(params.wrapHue) || rawHMin > rawHMax;

  let hMin: number;
  let hMax: number;

  if (wrapHue) {
    hMin = normalizeHue(Math.round(rawHMin));
    hMax = normalizeHue(Math.round(rawHMax));
    if (hMin === hMax) {
      hMax = (hMax + 1) % 180;
    }
    wrapHue = hMin > hMax;
  } else {
    hMin = clamp(Math.round(rawHMin), 0, 179);
    hMax = clamp(Math.round(rawHMax), 0, 179);
    if (hMin > hMax) {
      [hMin, hMax] = [hMax, hMin];
    }
    if (hMin === hMax) {
      hMax = Math.min(179, hMin + 1);
    }
  }

  return {
    hMin,
    hMax,
    wrapHue,
    sMin: clamp(Math.round(params.sMin ?? 0), 0, 255),
    sMax: clamp(Math.round(params.sMax ?? 255), 0, 255),
    vMin: clamp(Math.round(params.vMin ?? 0), 0, 255),
    vMax: clamp(Math.round(params.vMax ?? 255), 0, 255)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function expandOrFallback(min: number, max: number, fallback: [number, number]): [number, number] {
  if (max - min < 16) {
    const mid = (max + min) / 2;
    min = Math.floor(mid - 8);
    max = Math.ceil(mid + 8);
  }
  if (min >= max) {
    return [fallback[0], fallback[1]];
  }
  return [clamp(min, 0, 255), clamp(max, 0, 255)];
}

function resolveCenterHue(params: SweepParams): number {
  if (params.wrapHue && params.hMin !== params.hMax) {
    const wrapValid = params.hMin > params.hMax;
    if (wrapValid) {
      const highSpan = 180 - params.hMin;
      const lowSpan = params.hMax;
      const highMid = params.hMin + highSpan / 2;
      const lowMid = params.hMax / 2;

      const highRad = (normalizeHue(highMid) * Math.PI) / 90;
      const lowRad = (normalizeHue(lowMid) * Math.PI) / 90;

      const hx = Math.cos(highRad) * highSpan + Math.cos(lowRad) * lowSpan;
      const hy = Math.sin(highRad) * highSpan + Math.sin(lowRad) * lowSpan;

      if (hx === 0 && hy === 0) {
        return normalizeHue(params.hMin);
      }
      return normalizeHue((Math.atan2(hy, hx) * 90) / Math.PI);
    }
  }

  return normalizeHue((params.hMin + params.hMax) / 2);
}
