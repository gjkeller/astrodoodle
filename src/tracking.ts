// src/tracking.ts
// Tell TS about the global OpenCV symbol.
declare const cv: any;

export type TunerParams = {
  hMin: number; hMax: number;
  sMin: number; sMax: number;
  vMin: number; vMax: number;
  bright: number;      // -100..100
  useEdges?: boolean;  // if true, run Canny on the mask to keep just edges
};

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
  private src!: any;    // RGBA
  private bgr!: any;    // BGR
  private hsv!: any;    // HSV
  private mask!: any;   // 8U mask
  private brightMat!: any; // for brightness addWeighted
  private edges!: any;  // for Canny
  private contours!: any;
  private hierarchy!: any;

  // Ball position
  public x: number | null = null;
  public y: number | null = null;

  // Res
  private W = 640;
  private H = 480;

  // Params
  private params: TunerParams = {
    hMin: 20, hMax: 35,
    sMin: 120, sMax: 255,
    vMin: 120, vMax: 255,
    bright: 0,
    useEdges: false
  };

  private cvReady = false;
  private started = false;

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

    // Wait for OpenCV runtime
    const waitCv = () =>
      new Promise<void>((resolve) => {
        const tick = () => {
          if ((window as any).cv && cv.Mat) resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });

    waitCv().then(() => {
      this.cvReady = true;
    });
  }

  public setParams(p: Partial<TunerParams>) {
    this.params = { ...this.params, ...p };
  }

  public async startCamera() {
    if (!this.cvReady) {
      console.warn("OpenCV not ready yet.");
      return;
    }
    if (this.started) return;

    // Request camera on user gesture.
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
    this.brightMat = new cv.Mat(this.H, this.W, cv.CV_8UC3);
    this.edges = new cv.Mat(this.H, this.W, cv.CV_8UC1);
    this.contours = new cv.MatVector();
    this.hierarchy = new cv.Mat();

    this.started = true;
  }

  public update() {
    if (!this.started) return;

    // Draw the live video frame onto raw canvas
    this.rawCtx.drawImage(this.video, 0, 0, this.W, this.H);

    // Get ImageData and make OpenCV Mat
    const imgData = this.rawCtx.getImageData(0, 0, this.W, this.H);
    this.src.data.set(imgData.data);

    // Convert RGBA -> BGR
    cv.cvtColor(this.src, this.bgr, cv.COLOR_RGBA2BGR);

    // Brightness adjust: addWeighted with scalar (beta)
    const beta = Number(this.params.bright) || 0; // -100..100
    // alpha=1, beta=brightness
    this.bgr.convertTo(this.brightMat, -1, 1, beta);

    // Convert to HSV
    cv.cvtColor(this.brightMat, this.hsv, cv.COLOR_BGR2HSV);

    // Build thresholds
    const { hMin, hMax, sMin, sMax, vMin, vMax } = this.params;
    const low = new cv.Mat(this.H, this.W, this.hsv.type(), [hMin, sMin, vMin, 0]);
    const high = new cv.Mat(this.H, this.W, this.hsv.type(), [hMax, sMax, vMax, 255]);

    // Mask by HSV
    cv.inRange(this.hsv, low, high, this.mask);
    low.delete(); high.delete();

    // Optional: keep just edges to isolate LED contours
    if (this.params.useEdges) {
      cv.Canny(this.mask, this.edges, 100, 200);
      this.mask = this.edges; // display edges instead of full mask
    } else {
      // little cleanup for blob
      cv.erode(this.mask, this.mask, new cv.Mat(), new cv.Point(-1, -1), 1);
      cv.dilate(this.mask, this.mask, new cv.Mat(), new cv.Point(-1, -1), 2);
      cv.GaussianBlur(this.mask, this.mask, new cv.Size(7, 7), 0, 0);
    }

    // Find contours to pick the ball
    cv.findContours(this.mask, this.contours, this.hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let bestArea = 0;
    let cx: number | null = null;
    let cy: number | null = null;

    for (let i = 0; i < this.contours.size(); i++) {
      const cnt = this.contours.get(i);
      const area = cv.contourArea(cnt);
      if (area > bestArea) {
        const M = cv.moments(cnt);
        if (M.m00) {
          cx = M.m10 / M.m00;
          cy = M.m01 / M.m00;
          bestArea = area;
        }
      }
    }

    this.x = cx;
    this.y = cy;

    // Draw mask/edges into maskCanvas for display in Phaser
    const show = new cv.Mat();
    cv.cvtColor(this.mask, show, cv.COLOR_GRAY2RGBA);
    const outImgData = new ImageData(new Uint8ClampedArray(show.data), this.W, this.H);
    this.maskCtx.putImageData(outImgData, 0, 0);
    show.delete();
  }
}