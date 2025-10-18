// declarations/dollar1-unistroke.d.ts
declare module "@2players/dollar1-unistroke-recognizer" {
  interface Point { x: number; y: number; }
  interface Result { name: string; score: number; }
  class GestureRecognizer {
    constructor(options?: any);
    add(name: string, points: Point[]): void;
    recognize(points: Point[], verbose?: boolean): Result;
  }
  export default GestureRecognizer;
}