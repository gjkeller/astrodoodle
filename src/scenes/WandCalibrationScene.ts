import { Visualizer } from '../ui/visualizer';
import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';
import { visualizerManager } from '../core';

export default class WandCalibrationScene extends Phaser.Scene {
  private visualizer: Visualizer;
  private backButton: Phaser.GameObjects.Container;
  
  constructor() {
    super('WandCalibration');
  }
  
  create(): void {
    console.log('WandCalibrationScene: Creating scene');
    // Only initialize if not already initialized or if the previous scene was destroyed
    if (!visualizerManager.isInitialized()) {
      console.log('WandCalibrationScene: Initializing visualizer manager');
      visualizerManager.initialize(this);
    } else if (visualizerManager.needsReinitialization()) {
      console.log('WandCalibrationScene: Reinitializing visualizer manager (scene destroyed)');
      visualizerManager.initialize(this);
    } else {
      console.log('WandCalibrationScene: Visualizer manager already initialized and working');
      // Just update the scene reference without reinitializing
      visualizerManager.updateSceneReference(this);
    }
    
    // Dark background
    this.add.rectangle(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      GAME_SETTINGS.CANVAS_WIDTH,
      GAME_SETTINGS.CANVAS_HEIGHT,
      0x000000
    );
    
    // Title
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      80,
      'WAND CALIBRATION',
      { fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#edeeff' }
    ).setOrigin(0.5);
    
    // Instructions
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      140,
      'Move your wand to calibrate',
      { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#aaaaaa' }
    ).setOrigin(0.5);
    
    // Large centered visualizer
    this.visualizer = new Visualizer(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      1.0, // Larger scale
      0xFFFFFF,
      3,
      0x222222
    );
    
    // Back button
    this.createBackButton();
  }
  
  update(): void {
    // Update visualizer manager
    visualizerManager.update();
    
    // Get data from singleton manager
    const points = visualizerManager.getPoints();
    const position = visualizerManager.getCurrentPosition();
    const spell = visualizerManager.getCurrentSpell();
    const calibratedColor = visualizerManager.getCalibratedColor();
    
    // Debug logging
    if (points.length > 0 || position || spell !== 'NONE') {
      // console.log('WandCalibrationScene: Data - points:', points.length, 'position:', position, 'spell:', spell);
    }
    
    // Update visualizer border color with calibrated color
    if (calibratedColor) {
      const borderColor = this.hsvToRgbHex(calibratedColor.h, calibratedColor.s, calibratedColor.v);
      this.visualizer.setBorderColor(borderColor, 3);
    }
    
    // Sync visualizer with singleton manager
    this.visualizer.setPoints(points);
    this.visualizer.setCurrentPosition(position);
    this.visualizer.showSpell(visualizerManager.getVisualizerSpell()); // Use visualizer spell for display
  }

  /**
   * Convert HSV values to RGB hex color (copied from VisualizerTestScene)
   */
  private hsvToRgbHex(h: number, s: number, v: number): number {
    // Normalize OpenCV HSV values to 0-1 range
    const hNorm = h / 179;
    const sNorm = s / 255;
    const vNorm = v / 255;

    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1));
    const m = vNorm - c;

    let r = 0, g = 0, b = 0;

    if (hNorm < 1/6) {
      r = c; g = x; b = 0;
    } else if (hNorm < 2/6) {
      r = x; g = c; b = 0;
    } else if (hNorm < 3/6) {
      r = 0; g = c; b = x;
    } else if (hNorm < 4/6) {
      r = 0; g = x; b = c;
    } else if (hNorm < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (r << 16) | (g << 8) | b;
  }
  
  private createBackButton(): void {
    const buttonWidth = 150;
    const buttonHeight = 50;
    
    
    this.backButton = this.add.container(100, GAME_SETTINGS.CANVAS_HEIGHT - 80);
    
    // Create gray back button background
    const bg = this.add.graphics();
    bg.fillStyle(0x666666, 0.8);
    bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    bg.lineStyle(2, 0x888888, 1);
    bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    
    // Create back button text
    const text = BitmapTextHelper.createButtonText(
      this,
      0,
      0,
      'Back'
    );
    
    this.backButton.add([bg, text]);
    this.backButton.setSize(buttonWidth, buttonHeight);
    this.backButton.setDepth(5);
    
    // Make button interactive
    this.backButton.setInteractive();
    
    // Add hover effects
    this.backButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x777777, 0.9);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, 0x999999, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    });
    
    this.backButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x666666, 0.8);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, 0x888888, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    });
    
    this.backButton.on('pointerdown', () => {
      this.goBack();
    });
  }

  private goBack(): void {
    this.scene.start('Settings');
  }
}
