// src/tracking/ball-tracker.ts
import type { SweepParams, TrackedBall } from "./types";
import type { CalibratedBall } from "./calibration";

declare const cv: any;

type SweepResult = {
  cx: number;
  cy: number;
  radius: number;
  coverage: number;
  score: number;
};

const MIN_CONTOUR_AREA = 80;
const MIN_CIRCULARITY = 0.5;

export class BallTrackerEngine {
  private mask: any;
  private tempMask: any;
  private workMask: any;
  private contours: any;
  private hierarchy: any;
  private kernel: any;

  constructor(private readonly width: number, private readonly height: number) {
    this.mask = new cv.Mat(this.height, this.width, cv.CV_8UC1);
    this.tempMask = new cv.Mat(this.height, this.width, cv.CV_8UC1);
    this.workMask = new cv.Mat(this.height, this.width, cv.CV_8UC1);
    this.contours = new cv.MatVector();
    this.hierarchy = new cv.Mat();
    this.kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  }

  public trackBalls(hsvMat: any, balls: CalibratedBall[]): TrackedBall[] {
    this.mask.setTo(new cv.Scalar(0));
    const results: TrackedBall[] = [];

    for (const ball of balls) {
      const result = this.evaluateBall(hsvMat, ball.params);
      if (result) {
        results.push({
          id: ball.id,
          centerHue: ball.centerHue,
          params: { ...ball.params },
          x: result.cx,
          y: result.cy,
          radius: result.radius,
          coverage: result.coverage
        });
      } else {
        results.push({
          id: ball.id,
          centerHue: ball.centerHue,
          params: { ...ball.params },
          x: null,
          y: null,
          radius: null,
          coverage: 0
        });
      }
    }

    return results;
  }

  public getMask() {
    return this.mask;
  }

  private evaluateBall(hsvMat: any, params: SweepParams): SweepResult | null {
    const low = new cv.Mat(this.height, this.width, hsvMat.type(), [params.hMin, params.sMin, params.vMin, 0]);
    const high = new cv.Mat(this.height, this.width, hsvMat.type(), [params.hMax, params.sMax, params.vMax, 255]);
    cv.inRange(hsvMat, low, high, this.tempMask);
    low.delete();
    high.delete();

    cv.morphologyEx(this.tempMask, this.tempMask, cv.MORPH_OPEN, this.kernel, new cv.Point(-1, -1), 1);
    cv.dilate(this.tempMask, this.tempMask, this.kernel, new cv.Point(-1, -1), 1);
    cv.GaussianBlur(this.tempMask, this.tempMask, new cv.Size(7, 7), 0, 0);

    cv.bitwise_or(this.mask, this.tempMask, this.mask);

    this.tempMask.copyTo(this.workMask);
    cv.findContours(this.workMask, this.contours, this.hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let bestScore = 0;
    let bestResult: SweepResult | null = null;
    const coverage = cv.countNonZero(this.tempMask) / (this.width * this.height);

    for (let i = 0; i < this.contours.size(); i++) {
      const cnt = this.contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < MIN_CONTOUR_AREA) {
        cnt.delete();
        continue;
      }
      const perimeter = cv.arcLength(cnt, true);
      if (perimeter <= 0) {
        cnt.delete();
        continue;
      }
      const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
      if (circularity < MIN_CIRCULARITY) {
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
        cx: this.width / 2,
        cy: this.height / 2,
        radius: Math.sqrt((coverage * this.width * this.height) / Math.PI),
        coverage
      };
    }

    return bestResult;
  }
}
