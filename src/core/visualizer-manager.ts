import { Spell, Point } from '../ui/visualizer';
import { VisionTuner } from '../tracking';
import { addPoint, getBestPlayerGestures, playerMap } from '../gesture/tracker';

/**
 * Singleton manager for the VisualizerTestScene
 * Ensures only one instance exists and provides a clean API
 */
class VisualizerManager {
  private static instance: VisualizerManager | null = null;
  private scene: Phaser.Scene | null = null;
  private vision: any = null; // VisionTuner instance
  private cameraStarted: boolean = false;
  private currentSpell: Spell = Spell.NONE;
  private lastSpellTime: number = 0;
  private readonly SPELL_DEBOUNCE_MS = 300;
  private readonly SPELL_DISPLAY_DURATION_MS = 1000; // 1 second timeout
  
  // Separate visualizer memory for player feedback
  private visualizerSpell: Spell = Spell.NONE;
  private visualizerSpellTime: number = 0;
  private readonly VISUALIZER_SPELL_DURATION_MS = 2000; // 2 seconds for visualizer feedback
  private lastPointsTime: number = 0;
  private lastPositionTime: number = 0;
  private readonly WAND_PRESENCE_TIMEOUT_MS = 500;
  private currentPoints: Point[] = [];
  private currentPosition: Point | null = null;
  private readonly PLAYER_ID = 1; // Same as VisualizerTestScene

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): VisualizerManager {
    if (!VisualizerManager.instance) {
      VisualizerManager.instance = new VisualizerManager();
    }
    return VisualizerManager.instance;
  }

  /**
   * Initialize the visualizer with a Phaser scene
   * This can be called multiple times with different scenes - it will update the current scene reference
   */
  public initialize(scene: Phaser.Scene): void {
    // Update scene reference (this is normal when transitioning between scenes)
    this.scene = scene;
    console.log('VisualizerManager: Updated scene reference');
    
    // Only initialize vision system if not already done or if the previous scene was destroyed
    if (!this.vision || this.needsReinitialization()) {
      this.initializeVision();
    }
  }

  /**
   * Check if the visualizer manager is already initialized
   */
  public isInitialized(): boolean {
    return this.vision !== null && this.cameraStarted;
  }

  /**
   * Check if the visualizer manager needs reinitialization (scene was destroyed)
   */
  public needsReinitialization(): boolean {
    // Only reinitialize if we have a vision system but no valid scene reference
    // This happens when a scene is destroyed (not just paused/inactive)
    return this.vision !== null && (!this.scene || !this.scene.scene);
  }

  /**
   * Update the scene reference without reinitializing the vision system
   * Use this when the vision system is working but you need to update the scene reference
   */
  public updateSceneReference(scene: Phaser.Scene): void {
    this.scene = scene;
    console.log('VisualizerManager: Updated scene reference (no reinitialization)');
  }

  private async initializeVision(): Promise<void> {
    if (!this.scene) return;

    try {
      // Clean up existing vision system if it exists
      if (this.vision) {
        console.log('VisualizerManager: Cleaning up existing vision system');
        this.cleanup();
      }
      
      this.vision = new VisionTuner();
      console.log('VisualizerManager: VisionTuner created');
      
      // Start camera
      await this.startCamera();
    } catch (error) {
      console.error('VisualizerManager: Failed to initialize vision:', error);
    }
  }

  private async startCamera(): Promise<void> {
    if (!this.vision) return;

    try {
      // Always start camera (handles reinitialization)
      await this.vision.startCamera();
      this.cameraStarted = true;
      console.log('VisualizerManager: Camera started successfully');
    } catch (error) {
      console.error('VisualizerManager: Failed to start camera:', error);
    }
  }

  /**
   * Update the visualizer - should be called every frame
   */
  public update(): void {
    if (!this.vision || !this.cameraStarted) {
      console.log('VisualizerManager: Not ready - vision:', !!this.vision, 'cameraStarted:', this.cameraStarted);
      return;
    }

    try {
      // Check if current spell should timeout
      this.checkSpellTimeout();
      
      // This is the key method that handles:
      // 1. Camera frame processing
      // 2. Four corners + center color sampling for calibration
      // 3. Ball tracking and gesture detection
      // 4. Updating primaryParams (calibrated color)
      const frameProcessed = this.vision.update();
      
      if (frameProcessed) {
        this.checkForGestures();
        this.updateVisualizer();
      }
    } catch (error) {
      console.error('VisualizerManager: Error in update:', error);
    }
  }

  private checkForGestures(): void {
    if (!this.vision || !this.cameraStarted) return;

    try {
      const bestGestures = getBestPlayerGestures();
      const gesture = bestGestures.get(this.PLAYER_ID);
      
      if (gesture) {
        // Map gesture names to our Spell enum (gesture is a string)
        const gestureMapping: Record<string, Spell> = {
          'null': Spell.NULL,
          'five-point star': Spell.STAR,
          'triangle': Spell.TRIANGLE,
          'arrow': Spell.ARROW,
          'arrowhead': Spell.ARROW
        };
        
        const mappedSpell = gestureMapping[gesture.toLowerCase()];
        if (mappedSpell) {
          this.setCurrentSpell(mappedSpell);
        }
      }
    } catch (error) {
      // Silently handle errors - vision might not be ready
    }
  }

  private updateVisualizer(): void {
    if (!this.vision || !this.cameraStarted) return;

    try {
      // Check if we have a valid position from the vision system
      if (this.vision.primaryX !== null && this.vision.primaryY !== null) {
        // Update current position
        this.currentPosition = { 
          x: this.vision.primaryX, 
          y: this.vision.primaryY 
        };
        
        // Add point to tracker system for player 1
        addPoint(this.currentPosition.x, this.currentPosition.y, this.PLAYER_ID);
        
        // Update timestamp for wand presence detection
        this.lastPositionTime = Date.now();
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
      
      this.currentPoints = points;
      
      // Update timestamp for wand presence detection
      if (points.length > 0) {
        this.lastPointsTime = Date.now();
      }
    } catch (error) {
      // Silently handle errors
    }
  }

  private setCurrentSpell(spell: Spell): void {
    const now = Date.now();
    if (now - this.lastSpellTime > this.SPELL_DEBOUNCE_MS) {
      this.currentSpell = spell;
      this.lastSpellTime = now;
      
      // Also set visualizer spell for player feedback
      this.visualizerSpell = spell;
      this.visualizerSpellTime = now;
    }
  }

  private checkSpellTimeout(): void {
    if (this.currentSpell !== Spell.NONE) {
      const now = Date.now();
      if (now - this.lastSpellTime > this.SPELL_DISPLAY_DURATION_MS) {
        this.currentSpell = Spell.NONE;
      }
    }
    
    // Check visualizer spell timeout
    if (this.visualizerSpell !== Spell.NONE) {
      const now = Date.now();
      if (now - this.visualizerSpellTime > this.VISUALIZER_SPELL_DURATION_MS) {
        this.visualizerSpell = Spell.NONE;
      }
    }
  }

  /**
   * Get the current detected spell (for game logic)
   */
  public getCurrentSpell(): Spell {
    return this.currentSpell;
  }
  
  /**
   * Get the visualizer spell (for player feedback display)
   */
  public getVisualizerSpell(): Spell {
    return this.visualizerSpell;
  }
  
  /**
   * Consume the current spell (removes it from game logic but keeps in visualizer)
   */
  public consumeSpell(): Spell {
    const consumedSpell = this.currentSpell;
    this.currentSpell = Spell.NONE;
    return consumedSpell;
  }

  /**
   * Get the current wand points
   */
  public getPoints(): Point[] {
    return this.currentPoints;
  }

  /**
   * Get the current wand position
   */
  public getCurrentPosition(): Point | null {
    return this.currentPosition;
  }

  /**
   * Check if wand is currently present
   */
  public isWandPresent(): boolean {
    if (!this.vision || !this.cameraStarted) return false;

    const now = Date.now();
    const recentPoints = now - this.lastPointsTime < this.WAND_PRESENCE_TIMEOUT_MS;
    const recentPosition = now - this.lastPositionTime < this.WAND_PRESENCE_TIMEOUT_MS;
    
    return recentPoints || recentPosition;
  }

  /**
   * Get the calibrated color parameters (for visualizer border color)
   */
  public getCalibratedColor(): { h: number; s: number; v: number } | null {
    if (!this.vision || !this.vision.primaryParams) return null;
    
    const params = this.vision.primaryParams;
    // Use the middle values of the HSV range for the color
    const h = (params.hMin + params.hMax) / 2;
    const s = (params.sMin + params.sMax) / 2;
    const v = (params.vMin + params.vMax) / 2;
    
    return { h, s, v };
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.vision && this.cameraStarted) {
      try {
        this.vision.clearBalls();
        
        // Stop the MediaStream
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.srcObject) {
          const mediaStream = videoElement.srcObject as MediaStream;
          mediaStream.getTracks().forEach(track => track.stop());
          videoElement.srcObject = null;
        }
        
        console.log('VisualizerManager: Camera resources cleaned up');
      } catch (error) {
        console.error('VisualizerManager: Error cleaning up camera resources:', error);
      }
    }
    
    this.cameraStarted = false;
    this.vision = null;
    this.scene = null;
  }

  /**
   * Reset the singleton instance (for testing or complete restart)
   */
  public static reset(): void {
    if (VisualizerManager.instance) {
      VisualizerManager.instance.cleanup();
      VisualizerManager.instance = null;
    }
  }
}

// Export singleton instance
export const visualizerManager = VisualizerManager.getInstance();
