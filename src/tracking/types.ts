// src/tracking/types.ts

export type SweepParams = {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
  wrapHue?: boolean;
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
