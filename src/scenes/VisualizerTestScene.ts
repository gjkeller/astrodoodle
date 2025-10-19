import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';
import { VisionTuner } from '../tracking';
import { Visualizer, Spell, Point } from '../ui/visualizer';
import { addPoint, getBestPlayerGestures, playerMap } from '../gesture/tracker';

export default class VisualizerTestScene extends Phaser.Scene {
  private backButton: Phaser.GameObjects.Container;
  private vision: VisionTuner;
  private visualizer: Visualizer;
  private currentPos: Point = { x: 320, y: 240 };
  private currentSpell: Spell = Spell.NONE;
  private spellButtons: Phaser.GameObjects.Container[] = [];

  // Properties for camera tracking
  private cameraStarted = false;
  private statusText: Phaser.GameObjects.Text;
  
  // Gesture detection timing
  private gestureCheckTimer = 0;
  private gestureDisplayTimer = 0;
  private displayingGesture = false;
  private readonly GESTURE_CHECK_INTERVAL = 100; // ms
  private readonly GESTURE_DISPLAY_DURATION = 1000; // ms
  private readonly PLAYER_ID = 1; // We'll use player 1

  // Background mode - when true, runs silently without UI
  private backgroundMode: boolean = false;

  constructor() {
    super('VisualizerTest');
  }

  create(data?: { backgroundMode?: boolean }): void {
    // Check if we're in background mode (launched as parallel scene)
    this.backgroundMode = data?.backgroundMode || false;
    
    console.log(`VisualizerTestScene: Creating with backgroundMode=${this.backgroundMode}`);
    
    this.vision = new VisionTuner();
    
    if (!this.backgroundMode) {
      // Create UI elements only when not in background mode
      this.createBackground();
      this.createTitle();
      this.createContent();
      this.createBackButton();
      this.createStatusText();
      this.setupInput();
    }
    
    // Start camera automatically (always needed for gesture detection)
    this.startCameraTracking();
  }
  
  private createStatusText(): void {
    this.statusText = this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT - 100,
      "Initializing OpenCV...",
      { 
        fontFamily: 'Arial', 
        fontSize: '16px', 
        color: '#FFFF88',
        align: 'center' 
      }
    );
    this.statusText.setOrigin(0.5, 0.5);
  }
  
  private updateStatusText(text: string): void {
    if (this.statusText && !this.backgroundMode) {
      this.statusText.setText(text);
    }
  }
  
  private startCameraTracking(): void {
    // First wait for OpenCV to be ready
    this.vision.whenReady().then(async () => {
      this.updateStatusText("OpenCV ready. Starting camera...");
      
      try {
        // Start the camera
        await this.vision.startCamera();
        this.cameraStarted = true;
        this.updateStatusText("Camera running. Tracking position.");
      } catch (error) {
        console.error("Failed to start camera:", error);
        this.updateStatusText("Error: Could not start camera. Check permissions.");
      }
    });
  }
  
  update(_time: number, delta: number): void {
    // Only process if the camera is started
    if (this.cameraStarted) {
      // Update vision system to process current frame
      const processed = this.vision.update();
      
      if (processed && this.vision.primaryX !== null && this.vision.primaryY !== null) {
        // TODO: gabe look here for cv connected or not thingy
        // We have a valid position from the vision system
        this.currentPos = { 
          x: this.vision.primaryX, 
          y: this.vision.primaryY 
        };
        
        // Add point to tracker system for player 1
        addPoint(this.currentPos.x, this.currentPos.y, this.PLAYER_ID);
        
        // Update status to show we're tracking
        this.updateStatusText(`Tracking: x=${Math.round(this.currentPos.x)}, y=${Math.round(this.currentPos.y)}`);
      }
      
      // Handle gesture detection timing
      this.gestureCheckTimer += delta;
      
      // Check for gestures every 100ms
      if (this.gestureCheckTimer >= this.GESTURE_CHECK_INTERVAL) {
        this.gestureCheckTimer = 0;
        this.checkForGestures();
      }
      
      // Handle gesture display timeout
      if (this.displayingGesture) {
        this.gestureDisplayTimer += delta;
        if (this.gestureDisplayTimer >= this.GESTURE_DISPLAY_DURATION) {
          this.currentSpell = Spell.NONE;
          this.displayingGesture = false;
          this.gestureDisplayTimer = 0;
        }
      }
      
      // Update the visualizer with latest data
      this.updateVisualizer();
    }
  }

  isWandPresent(): boolean {
    if (!this.vision || !this.cameraStarted) {
      return false;
    }
    return this.vision.primaryX !== null && this.vision.primaryY !== null;
  }

  public getCurrentSpell(): Spell {
    if (!this.vision || !this.cameraStarted) {
      return Spell.NONE;
    }
    return this.currentSpell;
  }

  public getCurrentPosition(): Point | null {
    if (!this.vision || !this.cameraStarted) {
      return null;
    }
    return this.currentPos;
  }

  public getPoints(): Point[] {
    if (!this.vision || !this.cameraStarted) {
      return [];
    }
    
    // Get points from player 1's tracker data
    const playerPoints = playerMap.get(this.PLAYER_ID);
    const points: Point[] = [];
    
    if (playerPoints) {
      // Convert TimedPoint[] to Point[] (extract x, y from [x, y, timestamp])
      for (const [x, y] of playerPoints) {
        points.push({ x, y });
      }
    }
    
    return points;
  }
  
  private checkForGestures(): void {
    if (!this.vision || !this.cameraStarted) {
      return;
    }
    
    const bestGestures = getBestPlayerGestures();
    const gesture = bestGestures.get(this.PLAYER_ID);
    
    if (gesture) {
    console.log(bestGestures, gesture);
      // Map gesture names to our Spell enum
      const gestureMapping: Record<string, Spell> = {
        'null': Spell.NULL,
        'five-point star': Spell.STAR,
        'triangle': Spell.TRIANGLE,
        'arrowhead': Spell.ARROW
      };
      
      const mappedSpell = gestureMapping[gesture.toLowerCase()];
      if (mappedSpell) {
        this.currentSpell = mappedSpell;
        this.displayingGesture = true;
        this.gestureDisplayTimer = 0;
        console.log(`Detected gesture: ${gesture} -> ${mappedSpell}`);
      }
    }
  }

  /**
   * Convert HSV values to RGB hex color
   * @param h Hue (0-179 in OpenCV)
   * @param s Saturation (0-255 in OpenCV)
   * @param v Value/Brightness (0-255 in OpenCV)
   * @returns RGB color as hex number
   */
  private hsvToRgbHex(h: number, s: number, v: number): number {
    // Normalize OpenCV HSV values to 0-1 range
    const hNorm = (h * 2) / 360; // OpenCV hue is 0-179, convert to 0-1
    const sNorm = s / 255;
    const vNorm = v / 255;
    
    let r: number, g: number, b: number;
    
    const i = Math.floor(hNorm * 6);
    const f = hNorm * 6 - i;
    const p = vNorm * (1 - sNorm);
    const q = vNorm * (1 - f * sNorm);
    const t = vNorm * (1 - (1 - f) * sNorm);
    
    switch (i % 6) {
      case 0: r = vNorm; g = t; b = p; break;
      case 1: r = q; g = vNorm; b = p; break;
      case 2: r = p; g = vNorm; b = t; break;
      case 3: r = p; g = q; b = vNorm; break;
      case 4: r = t; g = p; b = vNorm; break;
      case 5: r = vNorm; g = p; b = q; break;
      default: r = g = b = 0;
    }
    
    // Convert to 0-255 range and then to hex
    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);
    
    return (rInt << 16) | (gInt << 8) | bInt;
  }

  private createBackground(): void {
    // Use the same background as other scenes
    const background = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'game-background'
    );
    background.setDisplaySize(GAME_SETTINGS.CANVAS_WIDTH, GAME_SETTINGS.CANVAS_HEIGHT);
    background.setDepth(0);
  }

  private createTitle(): void {
    const title = BitmapTextHelper.createTitleText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      100,
      'VISUALIZER TEST'
    );
    title.setDepth(10);
  }

  private createContent(): void {
    // Create a title for the visualizer
    const contentY = 180;
    
    // Add description text
    const testText = BitmapTextHelper.createButtonText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      contentY,
      'Visualizer Test'
    );
    testText.setDepth(5);
    testText.setOrigin(0.5, 0.5);
    
    // Create our visualizer (centered, scaled at 0.4)
    this.visualizer = new Visualizer(
      this, 
      GAME_SETTINGS.CANVAS_WIDTH / 2, 
      GAME_SETTINGS.CANVAS_HEIGHT / 2, 
      0.4, // scale
      0xFFFFFF, // border color - white by default
      3, // border width
      0x000066 // background color
    );
    
    // Create spell selection buttons
    this.createSpellButtons();
  }
  
  private createSpellButtons(): void {
    const spells = [Spell.NONE, Spell.NULL, Spell.STAR, Spell.TRIANGLE, Spell.ARROW];
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonGap = 20;
    const startX = GAME_SETTINGS.CANVAS_WIDTH / 2 - ((buttonWidth + buttonGap) * (spells.length - 1)) / 2;
    const buttonY = GAME_SETTINGS.CANVAS_HEIGHT - 100;
    
    spells.forEach((spell, index) => {
      const buttonX = startX + index * (buttonWidth + buttonGap);
      
      // Create button container
      const button = this.add.container(buttonX, buttonY);
      
      // Create button background
      const bg = this.add.graphics();
      bg.fillStyle(0x333366, 0.8);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, 0x6688FF, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      
      // Create button text
      const text = BitmapTextHelper.createButtonText(
        this,
        0,
        0,
        spell
      );
      text.setOrigin(0.5, 0.5);
      
      button.add([bg, text]);
      button.setSize(buttonWidth, buttonHeight);
      button.setInteractive();
      
      // Add hover and click effects
      button.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x444477, 0.9);
        bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
        bg.lineStyle(2, 0x88AAFF, 1);
        bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      });      
      button.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x333366, 0.8);
        bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
        bg.lineStyle(2, 0x6688FF, 1);
        bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      });
      
      button.on('pointerdown', () => {
        this.currentSpell = spell;
        this.updateVisualizer();
      });
      
      this.spellButtons.push(button);
    });
  }
  
  // No longer need generateTestPoints() as we get points from camera tracking
  
  private updateVisualizer(): void {
    if (this.visualizer && this.vision) {
      // Get points from player 1's tracker data
      const playerPoints = playerMap.get(this.PLAYER_ID);
      const visualizerPoints: Point[] = [];
      
      if (playerPoints) {
        // Convert TimedPoint[] to Point[] (extract x, y from [x, y, timestamp])
        for (const [x, y] of playerPoints) {
          visualizerPoints.push({ x, y });
        }
      }
      
      // Update border color based on calibrated wand color
      if (this.vision.primaryParams) {
        const params = this.vision.primaryParams;
        // Use the middle values of the HSV range for the color
        const h = (params.hMin + params.hMax) / 2;
        const s = (params.sMin + params.sMax) / 2;
        const v = (params.vMin + params.vMax) / 2;
        
        const borderColor = this.hsvToRgbHex(h, s, v);
        console.log(h,s,v, params);
        this.visualizer.setBorderColor(borderColor, 3);
      }
      
      this.visualizer.setPoints(visualizerPoints);
      this.visualizer.setCurrentPosition(this.currentPos);
      this.visualizer.showSpell(this.currentSpell);
    }
  }

  // The createTestAnimation method is no longer needed as we have our visualizer

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
      'BACK'
    );
    
    this.backButton.add([bg, text]);
    this.backButton.setSize(buttonWidth, buttonHeight);
    this.backButton.setDepth(5);
    
    // Add hover effects
    this.backButton.setInteractive();
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
      this.cleanupAndGoBack();
    });
  }

  private setupInput(): void {
    const keys = this.input.keyboard!;
    
    // ESC key to go back
    keys.on('keydown-ESC', () => {
      this.cleanupAndGoBack();
    });
  }

  private cleanupAndGoBack(): void {
    // Clean up camera resources
    if (this.cameraStarted && this.vision) {
      try {
        // Clear any tracked balls from the vision system
        this.vision.clearBalls();
        
        // Close the video stream if we have access to it
        if (this.vision.rawCanvas) {
          this.vision.rawCanvas.remove();
        }
        
        // Stop the MediaStream if we can access it
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const mediaStream = videoElement.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => track.stop());
          videoElement.srcObject = null;
        }
        
        this.updateStatusText("Camera resources released");
      } catch (error) {
        console.error("Error cleaning up camera resources:", error);
      }
      this.cameraStarted = false;
    }
    
    // Go back to Settings scene (only if not in background mode)
    if (!this.backgroundMode) {
      this.scene.start('Settings');
    }
  }

  // Called when the scene is about to shut down or transition
  shutdown(): void {
    console.log(`VisualizerTestScene: Shutting down with backgroundMode=${this.backgroundMode}`);
    
    // Only clean up if we're not in background mode
    // In background mode, we want to preserve the calibration
    if (!this.backgroundMode) {
      // Make sure we clean up camera resources
      if (this.cameraStarted && this.vision) {
        try {
          // Clear tracked data
          this.vision.clearBalls();
          
          // Stop the MediaStream
          const videoElement = document.querySelector('video');
          if (videoElement && videoElement.srcObject) {
            const mediaStream = videoElement.srcObject as MediaStream;
            mediaStream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
          }
        } catch (error) {
          console.error("Error cleaning up camera resources during shutdown:", error);
        }
      }
      
      // Remove event listeners
      this.input.keyboard?.off('keydown-ESC');
    } else {
      console.log("VisualizerTestScene: Preserving calibration in background mode");
    }
  }
}