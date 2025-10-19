export default class SweepScene extends Phaser.Scene {
  constructor() {
    super("SweepScene");
  }

  preload() {}

  create() {
    // Redirect to the main ball tracker scene which now owns the full UI.
    this.scene.start("BallTracker");
  }
}


