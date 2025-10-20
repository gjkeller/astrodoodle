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
  
  // Dual wand support for multiplayer
  private wand2Spell: Spell = Spell.NONE;
  private wand2LastSpellTime: number = 0;
  private wand2VisualizerSpell: Spell = Spell.NONE;
  private wand2VisualizerSpellTime: number = 0;
  private wand2LastPointsTime: number = 0;
  private wand2LastPositionTime: number = 0;
  private wand2CurrentPoints: Point[] = [];
  private wand2CurrentPosition: Point | null = null;
  private readonly WAND2_PLAYER_ID = 2; // Purple wand
  
  // Player-specific calibration tracking
  private player1Calibrated: boolean = false;
  private player2Calibrated: boolean = false;
  private currentCalibrationPlayer: 1 | 2 = 1;
  private player1BallId: number | null = null;
  private player2BallId: number | null = null;

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
      
      // Check for saved balls and auto-calibrate player 1 if ball 1 exists
      this.checkForSavedBallsAndAutoCalibrate();
    } catch (error) {
      console.error('VisualizerManager: Failed to start camera:', error);
    }
  }

  private checkForSavedBallsAndAutoCalibrate(): void {
    if (!this.vision) return;
    
    try {
      // Check if there are saved balls in localStorage
      const savedBalls = this.loadBallsFromStorage();
      console.log('VisualizerManager: Found saved balls:', savedBalls.length);
      
      // If we have at least one saved ball, auto-calibrate player 1 to ball 1
      if (savedBalls.length > 0) {
        const ball1 = savedBalls.find((ball: {id: number, centerHue: number, params: any}) => ball.id === 1);
        if (ball1) {
          console.log('VisualizerManager: Auto-calibrating Player 1 to saved ball 1');
          this.player1Calibrated = true;
          this.player1BallId = 1;
          console.log('VisualizerManager: Player 1 auto-calibrated with ball ID 1');
        }
        
        // If we have a second saved ball, auto-calibrate player 2 to ball 2
        if (savedBalls.length > 1) {
          const ball2 = savedBalls.find((ball: {id: number, centerHue: number, params: any}) => ball.id === 2);
          if (ball2) {
            console.log('VisualizerManager: Auto-calibrating Player 2 to saved ball 2');
            this.player2Calibrated = true;
            this.player2BallId = 2;
            console.log('VisualizerManager: Player 2 auto-calibrated with ball ID 2');
          }
        }
      }
    } catch (error) {
      console.error('VisualizerManager: Error checking for saved balls:', error);
    }
  }

  private loadBallsFromStorage(): Array<{id: number, centerHue: number, params: any}> {
    try {
      const saved = localStorage.getItem('visionTuner_balls');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (error) {
      console.warn('VisualizerManager: Failed to load balls from localStorage:', error);
      return [];
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
      
      // Map gesture names to our Spell enum (gesture is a string)
      const gestureMapping: Record<string, Spell> = {
        'null': Spell.NULL,
        'five-point star': Spell.STAR,
        'triangle': Spell.TRIANGLE,
        'arrow': Spell.ARROW,
        'arrowhead': Spell.ARROW
      };
      
      // Check gestures for wand 1 (orange - player 1)
      const wand1Gesture = bestGestures.get(this.PLAYER_ID);
      if (wand1Gesture) {
        const mappedSpell = gestureMapping[wand1Gesture.toLowerCase()];
        if (mappedSpell) {
          this.setCurrentSpell(mappedSpell);
        }
      }
      
      // Check gestures for wand 2 (purple - player 2)
      const wand2Gesture = bestGestures.get(this.WAND2_PLAYER_ID);
      if (wand2Gesture) {
        const mappedSpell = gestureMapping[wand2Gesture.toLowerCase()];
        if (mappedSpell) {
          this.setWand2Spell(mappedSpell);
        }
      }
    } catch (error) {
      // Silently handle errors - vision might not be ready
    }
  }

  private updateVisualizer(): void {
    if (!this.vision || !this.cameraStarted) return;

    try {
      // Update player 1 data based on calibration status
      if (this.player1Calibrated && this.player1BallId !== null) {
        // Use assigned ball ID for player 1
        const player1Ball = this.vision.trackedBalls.find(ball => ball.id === this.player1BallId);
        if (player1Ball && player1Ball.x !== null && player1Ball.y !== null) {
          this.currentPosition = { 
            x: player1Ball.x, 
            y: player1Ball.y 
          };
          
          // Add point to tracker system for player 1
          addPoint(this.currentPosition.x, this.currentPosition.y, this.PLAYER_ID);
          
          // Update timestamp for wand presence detection
          this.lastPositionTime = Date.now();
          
          // Debug logging
          if (Math.random() < 0.01) { // Log occasionally to avoid spam
            console.log(`Player 1 using ball ID ${this.player1BallId} at position ${this.currentPosition.x}, ${this.currentPosition.y}`);
          }
        }
      } else {
        // For calibration purposes, use primary ball data
        if (this.vision.primaryX !== null && this.vision.primaryY !== null) {
          this.currentPosition = { 
            x: this.vision.primaryX, 
            y: this.vision.primaryY 
          };
          
          // Add point to tracker system for player 1
          addPoint(this.currentPosition.x, this.currentPosition.y, this.PLAYER_ID);
          
          // Update timestamp for wand presence detection
          this.lastPositionTime = Date.now();
        }
      }
      
      // Update player 2 data based on calibration status
      if (this.player2Calibrated && this.player2BallId !== null) {
        // Use assigned ball ID for player 2
        const player2Ball = this.vision.trackedBalls.find(ball => ball.id === this.player2BallId);
        if (player2Ball && player2Ball.x !== null && player2Ball.y !== null) {
          this.wand2CurrentPosition = { 
            x: player2Ball.x, 
            y: player2Ball.y 
          };
          
          // Add point to tracker system for player 2
          addPoint(this.wand2CurrentPosition.x, this.wand2CurrentPosition.y, this.WAND2_PLAYER_ID);
          
          // Update timestamp for wand presence detection
          this.wand2LastPositionTime = Date.now();
        }
      } else {
        // For calibration purposes, use second ball data
        if (this.vision.trackedBalls && this.vision.trackedBalls.length > 1) {
          const secondBall = this.vision.trackedBalls[1];
          if (secondBall && secondBall.x !== null && secondBall.y !== null) {
            this.wand2CurrentPosition = { 
              x: secondBall.x, 
              y: secondBall.y 
            };
            
            // Add point to tracker system for player 2
            addPoint(this.wand2CurrentPosition.x, this.wand2CurrentPosition.y, this.WAND2_PLAYER_ID);
            
            // Update timestamp for wand presence detection
            this.wand2LastPositionTime = Date.now();
          }
        }
      }
      
      // Update points for wand 1
      this.updateWandPoints(this.PLAYER_ID, this.currentPoints, this.lastPointsTime);
      
      // Update points for wand 2
      this.updateWandPoints(this.WAND2_PLAYER_ID, this.wand2CurrentPoints, this.wand2LastPointsTime);
    } catch (error) {
      // Silently handle errors
    }
  }
  
  private updateWandPoints(playerId: number, currentPoints: Point[], lastPointsTime: number): void {
    const playerPoints = playerMap.get(playerId);
    const points: Point[] = [];
    
    if (playerPoints) {
      // Convert TimedPoint[] to Point[] (extract x, y from [x, y, timestamp])
      for (const [x, y] of playerPoints) {
        points.push({ x, y });
      }
    }
    
    currentPoints.length = 0;
    currentPoints.push(...points);
    
    // Update timestamp for wand presence detection
    if (points.length > 0) {
      if (playerId === this.PLAYER_ID) {
        this.lastPointsTime = Date.now();
      } else {
        this.wand2LastPointsTime = Date.now();
      }
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
  
  private setWand2Spell(spell: Spell): void {
    const now = Date.now();
    if (now - this.wand2LastSpellTime > this.SPELL_DEBOUNCE_MS) {
      this.wand2Spell = spell;
      this.wand2LastSpellTime = now;
      
      // Also set visualizer spell for player feedback
      this.wand2VisualizerSpell = spell;
      this.wand2VisualizerSpellTime = now;
    }
  }

  private checkSpellTimeout(): void {
    const now = Date.now();
    
    // Check wand 1 spell timeout
    if (this.currentSpell !== Spell.NONE && now - this.lastSpellTime > this.SPELL_DISPLAY_DURATION_MS) {
      this.currentSpell = Spell.NONE;
    }
    
    // Check wand 2 spell timeout
    if (this.wand2Spell !== Spell.NONE && now - this.wand2LastSpellTime > this.SPELL_DISPLAY_DURATION_MS) {
      this.wand2Spell = Spell.NONE;
    }
    
    // Check wand 1 visualizer spell timeout
    if (this.visualizerSpell !== Spell.NONE && now - this.visualizerSpellTime > this.VISUALIZER_SPELL_DURATION_MS) {
      this.visualizerSpell = Spell.NONE;
    }
    
    // Check wand 2 visualizer spell timeout
    if (this.wand2VisualizerSpell !== Spell.NONE && now - this.wand2VisualizerSpellTime > this.VISUALIZER_SPELL_DURATION_MS) {
      this.wand2VisualizerSpell = Spell.NONE;
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
   * Get the current wand points (for Player 1)
   */
  public getPoints(): Point[] {
    return this.currentPoints;
  }

  /**
   * Get the current wand position (for Player 1)
   */
  public getCurrentPosition(): Point | null {
    return this.currentPosition;
  }

  /**
   * Get Player 1's wand points
   */
  public getPlayer1Points(): Point[] {
    return this.currentPoints;
  }

  /**
   * Get Player 1's wand position
   */
  public getPlayer1CurrentPosition(): Point | null {
    return this.currentPosition;
  }

  /**
   * Get Player 2's wand points
   */
  public getPlayer2Points(): Point[] {
    return this.wand2CurrentPoints;
  }

  /**
   * Get Player 2's wand position
   */
  public getPlayer2CurrentPosition(): Point | null {
    return this.wand2CurrentPosition;
  }

  /**
   * Check if wand is currently present (for calibration - uses raw data)
   */
  public isWandPresent(): boolean {
    if (!this.vision || !this.cameraStarted) return false;

    const now = Date.now();
    const recentPoints = now - this.lastPointsTime < this.WAND_PRESENCE_TIMEOUT_MS;
    const recentPosition = now - this.lastPositionTime < this.WAND_PRESENCE_TIMEOUT_MS;
    
    return recentPoints || recentPosition;
  }

  /**
   * Check if player 1 wand is present (for game - requires calibration)
   */
  public isPlayer1WandPresent(): boolean {
    if (!this.vision || !this.cameraStarted || !this.player1Calibrated || this.player1BallId === null) return false;

    // Check if the assigned ball is currently being tracked
    const player1Ball = this.vision.trackedBalls.find(ball => ball.id === this.player1BallId);
    if (!player1Ball || player1Ball.x === null || player1Ball.y === null) return false;

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

  // Wand 2 (Purple) API methods for multiplayer
  /**
   * Get the current detected spell for wand 2 (for game logic)
   */
  public getWand2CurrentSpell(): Spell {
    return this.wand2Spell;
  }

  /**
   * Get the visualizer spell for wand 2 (for display feedback)
   */
  public getWand2VisualizerSpell(): Spell {
    const now = Date.now();
    if (now - this.wand2VisualizerSpellTime > this.VISUALIZER_SPELL_DURATION_MS) {
      return Spell.NONE;
    }
    return this.wand2VisualizerSpell;
  }

  /**
   * Consume the current spell for wand 2 (removes from game logic but keeps in visualizer)
   */
  public consumeWand2Spell(): Spell {
    const spell = this.wand2Spell;
    this.wand2Spell = Spell.NONE;
    return spell;
  }

  /**
   * Get the current wand 2 position
   */
  public getWand2CurrentPosition(): Point | null {
    return this.wand2CurrentPosition;
  }

  /**
   * Get the current wand 2 points
   */
  public getWand2Points(): Point[] {
    return [...this.wand2CurrentPoints];
  }

  /**
   * Check if wand 2 is currently present (for calibration - uses raw data)
   */
  public isWand2Present(): boolean {
    if (!this.vision || !this.cameraStarted) return false;

    const now = Date.now();
    const recentPoints = now - this.wand2LastPointsTime < this.WAND_PRESENCE_TIMEOUT_MS;
    const recentPosition = now - this.wand2LastPositionTime < this.WAND_PRESENCE_TIMEOUT_MS;
    
    return recentPoints || recentPosition;
  }

  /**
   * Check if player 2 wand is present (for game - requires calibration)
   */
  public isPlayer2WandPresent(): boolean {
    if (!this.vision || !this.cameraStarted || !this.player2Calibrated || this.player2BallId === null) return false;

    // Check if the assigned ball is currently being tracked
    const player2Ball = this.vision.trackedBalls.find(ball => ball.id === this.player2BallId);
    if (!player2Ball || player2Ball.x === null || player2Ball.y === null) return false;

    const now = Date.now();
    const recentPoints = now - this.wand2LastPointsTime < this.WAND_PRESENCE_TIMEOUT_MS;
    const recentPosition = now - this.wand2LastPositionTime < this.WAND_PRESENCE_TIMEOUT_MS;
    
    return recentPoints || recentPosition;
  }

  // Player-specific calibration methods
  /**
   * Set which player is currently being calibrated
   */
  public setCalibrationPlayer(player: 1 | 2): void {
    this.currentCalibrationPlayer = player;
    console.log(`VisualizerManager: Now calibrating for Player ${player}`);
  }

  /**
   * Mark the current calibration player as calibrated
   */
  public markPlayerCalibrated(): void {
    if (this.currentCalibrationPlayer === 1) {
      this.player1Calibrated = true;
      // Assign player 1 to the primary ball (first detected ball)
      if (this.vision && this.vision.trackedBalls && this.vision.trackedBalls.length > 0) {
        this.player1BallId = this.vision.trackedBalls[0].id;
        console.log(`VisualizerManager: Player 1 assigned to ball ID ${this.player1BallId} (primary ball)`);
        console.log('All tracked balls:', this.vision.trackedBalls.map(b => ({ id: b.id, x: b.x, y: b.y })));
      }
    } else {
      this.player2Calibrated = true;
      // Assign player 2 to the second ball (if available)
      if (this.vision && this.vision.trackedBalls && this.vision.trackedBalls.length > 1) {
        this.player2BallId = this.vision.trackedBalls[1].id;
        console.log(`VisualizerManager: Player 2 assigned to ball ID ${this.player2BallId} (second ball)`);
        console.log('All tracked balls:', this.vision.trackedBalls.map(b => ({ id: b.id, x: b.x, y: b.y })));
      } else {
        console.warn('VisualizerManager: No second ball available for Player 2 calibration');
        console.log('Available balls:', this.vision.trackedBalls.map(b => ({ id: b.id, x: b.x, y: b.y })));
      }
    }
    console.log(`VisualizerManager: Player ${this.currentCalibrationPlayer} calibrated!`);
    console.log('Current assignments:', { player1BallId: this.player1BallId, player2BallId: this.player2BallId });
  }

  /**
   * Check if a specific player is calibrated
   */
  public isPlayerCalibrated(player: 1 | 2): boolean {
    return player === 1 ? this.player1Calibrated : this.player2Calibrated;
  }

  /**
   * Check if player 1 is auto-calibrated from saved data
   */
  public isPlayer1AutoCalibrated(): boolean {
    return this.player1Calibrated && this.player1BallId === 1;
  }

  /**
   * Check if player 2 is auto-calibrated from saved data
   */
  public isPlayer2AutoCalibrated(): boolean {
    return this.player2Calibrated && this.player2BallId === 2;
  }

  /**
   * Get the current calibration player
   */
  public getCurrentCalibrationPlayer(): 1 | 2 {
    return this.currentCalibrationPlayer;
  }

  /**
   * Reset calibration status for all players
   */
  public resetCalibration(): void {
    this.player1Calibrated = false;
    this.player2Calibrated = false;
    this.currentCalibrationPlayer = 1;
    this.player1BallId = null;
    this.player2BallId = null;
    console.log('VisualizerManager: Calibration reset');
  }

  /**
   * Get debug information about tracked balls
   */
  public getDebugInfo(): { trackedBalls: any[], player1BallId: number | null, player2BallId: number | null } {
    return {
      trackedBalls: this.vision ? this.vision.trackedBalls || [] : [],
      player1BallId: this.player1BallId,
      player2BallId: this.player2BallId
    };
  }

  /**
   * Manually assign ball ID to player (for debugging)
   */
  public assignBallToPlayer(player: 1 | 2, ballId: number): void {
    if (player === 1) {
      this.player1BallId = ballId;
      this.player1Calibrated = true;
      console.log(`VisualizerManager: Manually assigned ball ID ${ballId} to Player 1`);
    } else {
      this.player2BallId = ballId;
      this.player2Calibrated = true;
      console.log(`VisualizerManager: Manually assigned ball ID ${ballId} to Player 2`);
    }
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
