import { BitmapTextHelper } from '../ui/bitmapText';
import { ProgressBar, Minimap } from '../ui';
import { Asteroid } from '../gameplay';
import { Missile } from '../gameplay/missile';
import { gameStore, eventBus, settingsStore, createModeInput, type ModeInput, visualizerManager } from '../core';
import { GAME_SETTINGS, msToTicks } from '../core/settings';
import { Visualizer, Spell } from '../ui/visualizer';
import { leaderboardStore } from '../core/leaderboard-store';
import type { PlayerId } from '../types/global';
// import type VisualizerTestScene from './VisualizerTestScene'; // Used in type annotations

export default class PlayingGameScene extends Phaser.Scene {
  private background1: Phaser.GameObjects.Image;
  private background2: Phaser.GameObjects.Image;
  private backgroundScrollY: number = 0;
  private backgroundTargetY1: number = 0;
  private backgroundTargetY2: number = 0;
  private progressBar: ProgressBar;
  private asteroids: Asteroid[] = [];
  private missiles: Missile[] = [];
  private staticShip: Phaser.GameObjects.Image;
  private player1Ship: Phaser.GameObjects.Image;
  private player2Ship: Phaser.GameObjects.Image;
  private minimap: Minimap | null = null;
  private minimap1: Minimap | null = null;
  private minimap2: Minimap | null = null;
  private visualizer: Visualizer | null = null;
  private visualizer1: Visualizer | null = null;
  private visualizer2: Visualizer | null = null;
  private fpsText: Phaser.GameObjects.Text | null = null;
  private modeInput: ModeInput | null = null;
  
  // Game timing
  private gameDurationTicks: number = msToTicks(60000); // 60 seconds = 1800 ticks
  private isGameActive: boolean = false;
  private isSpawningActive: boolean = false;
  private resultsOverlay: Phaser.GameObjects.Container | null = null;
  
  // Countdown
  private countdownText: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText | null = null;
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  
  // Tick-based timing
  private accumulator: number = 0;
  private currentTick: number = 0;
  private gameStartTick: number = 0;
  private ticksSinceLastSpawn: number = 0;
  private ticksSinceLastSpawnP1: number = 0;
  private ticksSinceLastSpawnP2: number = 0;
  
  // Difficulty progression
  private currentSpawnRateTicks: number = 60; // Start with 60 ticks (2 seconds)
  private currentFallSpeed: number = 1.0; // pixels per tick
  
  // Multiplayer difficulty progression (separate for each player)
  private currentSpawnRateTicksP1: number = 60;
  private currentSpawnRateTicksP2: number = 60;
  private currentFallSpeedP1: number = 1.0;
  private currentFallSpeedP2: number = 1.0;
  
  // Progressive symbol introduction for wand mode
  private symbolsUnlocked: string[] = [];
  
  constructor() {
    super('PlayingGame');
  }
  
  create(): void {
    const inputMode = settingsStore.getInputMode();
    
    // Initialize visualizer manager if in wand mode
    if (inputMode === 'wand') {
      console.log('PlayingGameScene: Starting in wand mode');
      if (!visualizerManager.isInitialized()) {
        visualizerManager.initialize(this);
      } else if (visualizerManager.needsReinitialization()) {
        visualizerManager.initialize(this);
      } else {
        visualizerManager.updateSceneReference(this);
      }
      
      this.modeInput = createModeInput('wand', this);
      this.symbolsUnlocked = ['TRIANGLE', 'NULL']; // Start with triangle and null
    } else {
      console.log('PlayingGameScene: Starting in keyboard mode');
      this.modeInput = createModeInput('keyboard', this);
    }
    
    // Create explosion animation
    this.createExplosionAnimation();
    
    this.createBackground();
    this.createProgressBar();
    this.createStaticShip();
    this.createPlayerHUD();
    this.createMinimap();
    this.createSplitScreenDivider();
    this.setupInput();
    this.setupEventListeners();
    
    // Start countdown to show game environment during countdown
    this.startCountdown();
    console.log('PlayingGameScene created, starting countdown...');
  }
  
  destroy(): void {
    // Clean up countdown if still running
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null;
    }
    
    if (this.countdownText) {
      this.countdownText.destroy();
      this.countdownText = null;
    }
  }
  
  update(_time: number, delta: number): void {
    // Update FPS counter only if enabled in settings
    if (GAME_SETTINGS.SHOW_FPS_COUNTER && this.fpsText) {
      const fps = Math.round(1000 / delta);
      this.fpsText.setText(`FPS: ${fps}`);
    }
    
    // Debug: Log update calls
    if (this.currentTick < 5) {
      console.log(`update called: isGameActive=${this.isGameActive}, currentTick=${this.currentTick}`);
    }
    
    // Handle wand input if in wand mode
    if (this.isGameActive && settingsStore.getInputMode() === 'wand') {
      this.handleWandInput();
    }
    
    // Update visualizer manager and data if in wand mode
    if (settingsStore.getInputMode() === 'wand') {
      visualizerManager.update();
      if (this.visualizer || this.visualizer1 || this.visualizer2) {
        this.updateVisualizerData();
      }
    }
    
    if (!this.isGameActive) return;
    
    this.accumulator += delta;
    
    while (this.accumulator >= GAME_SETTINGS.TICK_DURATION_MS) {
      this.fixedUpdate();
      this.accumulator -= GAME_SETTINGS.TICK_DURATION_MS;
      this.currentTick++;
    }
  }
  
  private createBackground(): void {
    // Create two background images for seamless looping
    this.background1 = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'game-background-xl'
    );
    
    this.background2 = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'game-background-xl'
    );
    
    // Set both backgrounds to full canvas width and 3600px height
    this.background1.setDisplaySize(GAME_SETTINGS.CANVAS_WIDTH, 3600);
    this.background2.setDisplaySize(GAME_SETTINGS.CANVAS_WIDTH, 3600);
    
    // Set origin to top-center for proper scrolling
    this.background1.setOrigin(0.5, 0);
    this.background2.setOrigin(0.5, 0);
    
    // Start at the bottom of the background image (so we see the bottom part first)
    this.backgroundScrollY = 0;
    this.background1.y = GAME_SETTINGS.CANVAS_HEIGHT / 2;
    this.background2.y = GAME_SETTINGS.CANVAS_HEIGHT / 2 - 3600; // Position second background above first
    
    // Initialize target positions for smooth tweening
    this.backgroundTargetY1 = this.background1.y;
    this.backgroundTargetY2 = this.background2.y;
    
    this.background1.setDepth(0);
    this.background2.setDepth(0);
  }
  
  private createProgressBar(): void {
    // Create a horizontal progress bar at the bottom - ProgressBar handles padding internally
    this.progressBar = new ProgressBar(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT - 50,
      GAME_SETTINGS.CANVAS_WIDTH - 180, 
      40
    );
    this.progressBar.setDepth(50);
  }
  
  private createStaticShip(): void {
    const playerCount = settingsStore.getPlayerCount();
    const shipY = GAME_SETTINGS.CANVAS_HEIGHT * 0.7; // Move ship down to 70% of screen height
    
    if (playerCount === 1) {
      // Singleplayer: one ship in center
      this.staticShip = this.add.image(
        GAME_SETTINGS.CANVAS_WIDTH / 2,
        shipY,
        'orange-ship'
      );
      this.staticShip.setScale(0.8);
      this.staticShip.setDepth(100);
      
      // Enable physics body for collision detection
      this.physics.world.enable(this.staticShip);
      const shipBody = this.staticShip.body as Phaser.Physics.Arcade.Body;
      shipBody.setSize(56, 72); // Width: 70*0.8, Height: 90*0.8
      shipBody.setOffset(-28, -36); // Center the collision box
      shipBody.setImmovable(true); // Ship doesn't move
    } else {
      // Multiplayer: two ships in their respective lanes
      // Player 1 ship (left side)
      this.player1Ship = this.add.image(
        GAME_SETTINGS.CANVAS_WIDTH * 0.25,
        shipY,
        'orange-ship'
      );
      this.player1Ship.setScale(0.8);
      this.player1Ship.setDepth(100);
      
      // Player 2 ship (right side)
      this.player2Ship = this.add.image(
        GAME_SETTINGS.CANVAS_WIDTH * 0.75,
        shipY,
        'purple-ship'
      );
      this.player2Ship.setScale(0.8);
      this.player2Ship.setDepth(100);
      
      // Enable physics bodies for collision detection
      this.physics.world.enable(this.player1Ship);
      this.physics.world.enable(this.player2Ship);
      
      const ship1Body = this.player1Ship.body as Phaser.Physics.Arcade.Body;
      const ship2Body = this.player2Ship.body as Phaser.Physics.Arcade.Body;
      
      ship1Body.setSize(56, 72);
      ship1Body.setOffset(-28, -36);
      ship1Body.setImmovable(true);
      
      ship2Body.setSize(56, 72);
      ship2Body.setOffset(-28, -36);
      ship2Body.setImmovable(true);
    }
  }
  
  private createPlayerHUD(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer: score at top center, multiplier at top right
      this.createScoreDisplay();
      this.createMultiplierDisplay();
    } else {
      // Multiplayer: dual displays
      this.createDualScoreDisplays();
      this.createDualMultiplierDisplays();
    }
  }
  
  private createScoreDisplay(): void {
    const scoreText = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      50,
      'SCORE: 0',
      GAME_SETTINGS.COLORS.WHITE
    );
    scoreText.setDepth(200);
    this.add.existing(scoreText);
    
    // Store reference for updates
    (this as any).scoreText = scoreText;
  }
  
  private createMultiplierDisplay(): void {
    const multiplierText = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH - 100,
      50,
      '★',
      GAME_SETTINGS.COLORS.YELLOW,
      80 
    );
    multiplierText.setDepth(200);
    this.add.existing(multiplierText);
    
    // Store reference for updates
    (this as any).multiplierText = multiplierText;
  }

  private createDualScoreDisplays(): void {
    // Player 1 score (left side)
    const scoreText1 = BitmapTextHelper.createHUDText(
      this,
      200,
      50,
      'P1: 0',
      GAME_SETTINGS.COLORS.ORANGE
    );
    scoreText1.setDepth(200);
    this.add.existing(scoreText1);
    
    // Player 2 score (right side)
    const scoreText2 = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH - 200,
      50,
      'P2: 0',
      GAME_SETTINGS.COLORS.PURPLE
    );
    scoreText2.setDepth(200);
    this.add.existing(scoreText2);
    
    // Store references for updates
    (this as any).scoreText1 = scoreText1;
    (this as any).scoreText2 = scoreText2;
  }

  private createDualMultiplierDisplays(): void {
    // Player 1 multiplier (left side)
    const multiplierText1 = BitmapTextHelper.createHUDText(
      this,
      200,
      100,
      '★',
      GAME_SETTINGS.COLORS.YELLOW
    );
    multiplierText1.setDepth(200);
    this.add.existing(multiplierText1);
    
    // Player 2 multiplier (right side)
    const multiplierText2 = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH - 200,
      100,
      '★',
      GAME_SETTINGS.COLORS.YELLOW
    );
    multiplierText2.setDepth(200);
    this.add.existing(multiplierText2);
    
    // Store references for updates
    (this as any).multiplierText1 = multiplierText1;
    (this as any).multiplierText2 = multiplierText2;
  }
  
  private createMinimap(): void {
    const inputMode = settingsStore.getInputMode();
    const playerCount = settingsStore.getPlayerCount();
    
    if (inputMode === 'keyboard') {
      if (playerCount === 1) {
        // Single minimap for singleplayer
        this.minimap = new Minimap(this, 100, GAME_SETTINGS.CANVAS_HEIGHT - 140);
      } else {
        // Dual minimaps for multiplayer
        this.minimap1 = new Minimap(this, 100, GAME_SETTINGS.CANVAS_HEIGHT - 140);
        this.minimap2 = new Minimap(this, GAME_SETTINGS.CANVAS_WIDTH - 100, GAME_SETTINGS.CANVAS_HEIGHT - 140);
      }
    } else {
      // Wand mode
      if (playerCount === 1) {
        // Single visualizer bottom-left
        this.visualizer = new Visualizer(
          this,
          100, // x
          GAME_SETTINGS.CANVAS_HEIGHT - 240, // y  
          0.5, // scale
          0xFFFFFF, // border
          2, // border width
          0x000000 // background
        );
      } else {
        // Dual visualizers for multiplayer
        this.visualizer1 = new Visualizer(
          this,
          100, // x - left side
          GAME_SETTINGS.CANVAS_HEIGHT - 240, // y  
          0.4, // scale - slightly smaller for dual
          GAME_SETTINGS.COLORS.ORANGE, // orange border for player 1
          2, // border width
          0x000000 // background
        );
        
        this.visualizer2 = new Visualizer(
          this,
          GAME_SETTINGS.CANVAS_WIDTH - 100, // x - right side
          GAME_SETTINGS.CANVAS_HEIGHT - 240, // y  
          0.4, // scale - slightly smaller for dual
          GAME_SETTINGS.COLORS.PURPLE, // purple border for player 2
          2, // border width
          0x000000 // background
        );
      }
    }
    
    // Create FPS counter if enabled
    if (GAME_SETTINGS.SHOW_FPS_COUNTER) {
      this.createFPSCounter();
    }
  }
  
  private createFPSCounter(): void {
    this.fpsText = this.add.text(10, 10, 'FPS: 0', {
      fontSize: '16px',
      fontFamily: '"Press Start 2P", monospace',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    });
    this.fpsText.setDepth(200);
  }

  private createSplitScreenDivider(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 2) {
      // Create a vertical line to separate the two player lanes
      const divider = this.add.graphics();
      divider.lineStyle(3, GAME_SETTINGS.COLORS.WHITE, 0.5);
      divider.beginPath();
      divider.moveTo(GAME_SETTINGS.CANVAS_WIDTH / 2, 0);
      divider.lineTo(GAME_SETTINGS.CANVAS_WIDTH / 2, GAME_SETTINGS.CANVAS_HEIGHT);
      divider.strokePath();
      divider.setDepth(10); // Above background but below ships
    }
  }
  
  private createExplosionAnimation(): void {
    // Create explosion animation from sprite sheet (12 frames)
    this.anims.create({
      key: 'explosion',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 }),
      frameRate: 20, // 20 FPS for smooth animation
      repeat: 0 // Play once and stop
    });
  }
  
  
  private startCountdown(): void {
    // Create countdown text overlay
    this.countdownText = BitmapTextHelper.createTitleText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      '3',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.countdownText.setDepth(1000); // High depth to appear above everything
    
    // Start countdown timer
    let count = 3;
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        count--;
        if (count > 0) {
          this.countdownText!.setText(count.toString());
        } else {
          this.countdownText!.setText('GO!');
          // Start the game after a brief "GO!" display
          this.time.delayedCall(500, () => {
            this.startGame();
          });
        }
      },
      callbackScope: this,
      loop: true,
      repeat: 2 // 3, 2, 1, then GO!
    });
  }
  
  private startGame(): void {
    // Remove countdown overlay
    if (this.countdownText) {
      this.countdownText.destroy();
      this.countdownText = null;
    }
    
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null;
    }
    
    // Initialize tick-based timing
    this.gameStartTick = 0;
    this.currentTick = 0;
    this.accumulator = 0;
    this.isGameActive = true;
    this.isSpawningActive = true;
    
    console.log('Game started, isGameActive:', this.isGameActive);
    
    // Start asteroid spawning
    this.startAsteroidSpawning();
    // Game loop now handled by Phaser's update() method
  }
  
  private startAsteroidSpawning(): void {
    // Spawning now handled by tick counter in fixedUpdate()
    this.ticksSinceLastSpawn = 0;
    this.ticksSinceLastSpawnP1 = 0;
    this.ticksSinceLastSpawnP2 = 0;
  }
  
  private spawnAsteroid(playerId: PlayerId): void {
    if (!this.isSpawningActive) return;
    
    console.log(`spawnAsteroid called for player ${playerId}, isSpawningActive:`, this.isSpawningActive);
    
    const inputMode = settingsStore.getInputMode();
    const sequenceLength = this.getSequenceLengthForWandMode();
    
    let sequence: string;
    if (inputMode === 'wand') {
      sequence = this.generateSpellSequence(sequenceLength);
    } else {
      sequence = this.generateKeyboardSequence(playerId, sequenceLength);
    }
    
    // Spawn asteroid in player's lane
    const spawnX = this.findValidSpawnPosition(playerId);
    console.log(`spawnX for player ${playerId}:`, spawnX);
    if (spawnX !== null) {
      const side = playerId === 0 ? 'left' : 'right';
      const asteroid = new Asteroid(this, spawnX, -100, side, sequence, playerId);
      this.asteroids.push(asteroid);
      console.log(`Asteroid spawned for player ${playerId}, total asteroids:`, this.asteroids.length);
    }
    
    // Chance for multiple asteroids to spawn at once - ONLY in keyboard mode
    if (inputMode === 'keyboard' && Math.random() < 0.15) { // 15% chance
      const secondSequence = this.generateKeyboardSequence(playerId, sequenceLength);
      const secondSpawnX = this.findValidSpawnPosition(playerId);
      if (secondSpawnX !== null) {
        const side = playerId === 0 ? 'left' : 'right';
        const secondAsteroid = new Asteroid(this, secondSpawnX, -100, side, secondSequence, playerId);
        this.asteroids.push(secondAsteroid);
      }
    }
  }
  
  private findValidSpawnPosition(playerId: PlayerId): number | null {
    const minDistance = 60; // Increased minimum distance between asteroids
    const maxAttempts = 10;
    const playerCount = settingsStore.getPlayerCount();
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let candidateX: number;
      
      if (playerCount === 1) {
        // Singleplayer: spawn anywhere on screen
        candidateX = 100 + Math.random() * (GAME_SETTINGS.CANVAS_WIDTH - 200);
      } else {
        // Multiplayer: spawn in player's lane
        if (playerId === 0) {
          // Player 1: left lane
          candidateX = 100 + Math.random() * (GAME_SETTINGS.CANVAS_WIDTH / 2 - 200);
        } else {
          // Player 2: right lane
          candidateX = GAME_SETTINGS.CANVAS_WIDTH / 2 + 100 + Math.random() * (GAME_SETTINGS.CANVAS_WIDTH / 2 - 200);
        }
      }
      
      // Check if this position is far enough from existing asteroids in the same lane
      let isValidPosition = true;
      for (const existingAsteroid of this.asteroids) {
        if (existingAsteroid.getPlayerId() === playerId) {
          const distance = Math.abs(candidateX - existingAsteroid.x);
          if (distance < minDistance) {
            isValidPosition = false;
            break;
          }
        }
      }
      
      if (isValidPosition) {
        return candidateX;
      }
    }
    
    // If we couldn't find a valid position after max attempts, return null
    // This prevents infinite loops and allows the game to continue
    return null;
  }
  
  private generateKeyboardSequence(playerId: PlayerId, length: number): string {
    const keys = playerId === 0 ? ['W', 'A', 'S', 'D'] : ['I', 'J', 'K', 'L'];
    const sequence: string[] = [];
    
    for (let i = 0; i < length; i++) {
      sequence.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    
    return sequence.join(' ');
  }


  private generateSpellSequence(length: number): string {
    // Use only unlocked symbols in wand mode
    const availableSpells = this.symbolsUnlocked.length > 0 
      ? this.symbolsUnlocked 
      : ['NULL', 'STAR', 'TRIANGLE', 'ARROW'];
    
    return Array(length).fill(0).map(() => 
      availableSpells[Math.floor(Math.random() * availableSpells.length)]
    ).join(' ');
  }
  
  private fixedUpdate(): void {
    const elapsedTicks = this.currentTick - this.gameStartTick;
    const progress = Math.min(elapsedTicks / this.gameDurationTicks, 1);
    
    // Debug: Log tick rate every 150 ticks (5 seconds at 30 TPS)
    if (elapsedTicks % 150 === 0 && elapsedTicks > 0) {
      console.log(`Tick ${elapsedTicks}: Progress ${(progress * 100).toFixed(1)}%`);
    }
    
    // Debug: Log first few ticks
    if (elapsedTicks < 10) {
      console.log(`fixedUpdate: elapsedTicks=${elapsedTicks}, isSpawningActive=${this.isSpawningActive}, ticksSinceLastSpawn=${this.ticksSinceLastSpawn}`);
    }
    
    // Update progress bar based on ticks
    this.progressBar.setProgress(0, progress);
    
    // Update difficulty over time (only while spawning is active)
    if (this.isSpawningActive) {
      this.updateDifficulty(elapsedTicks);
      this.updateSymbolProgression(elapsedTicks);
      
      const playerCount = settingsStore.getPlayerCount();
      
      if (playerCount === 1) {
        // Singleplayer spawning
        this.ticksSinceLastSpawn++;
        if (this.ticksSinceLastSpawn >= this.currentSpawnRateTicks) {
          console.log('Spawning asteroid, ticksSinceLastSpawn:', this.ticksSinceLastSpawn, 'currentSpawnRateTicks:', this.currentSpawnRateTicks);
          this.spawnAsteroid(0);
          this.ticksSinceLastSpawn = 0;
        }
      } else {
        // Multiplayer spawning - separate timers for each player
        this.ticksSinceLastSpawnP1++;
        this.ticksSinceLastSpawnP2++;
        
        if (this.ticksSinceLastSpawnP1 >= this.currentSpawnRateTicksP1) {
          console.log('Spawning asteroid for P1, ticksSinceLastSpawnP1:', this.ticksSinceLastSpawnP1, 'currentSpawnRateTicksP1:', this.currentSpawnRateTicksP1);
          this.spawnAsteroid(0);
          this.ticksSinceLastSpawnP1 = 0;
        }
        
        if (this.ticksSinceLastSpawnP2 >= this.currentSpawnRateTicksP2) {
          console.log('Spawning asteroid for P2, ticksSinceLastSpawnP2:', this.ticksSinceLastSpawnP2, 'currentSpawnRateTicksP2:', this.currentSpawnRateTicksP2);
          this.spawnAsteroid(1);
          this.ticksSinceLastSpawnP2 = 0;
        }
      }
    }
    
    // Update asteroids (always continue until game ends)
    this.updateAsteroids();
    
    // Update missiles
    this.updateMissiles();
    
    // Update background scroll
    this.updateBackgroundScroll();
    
    // Check if time limit has expired
    if (elapsedTicks >= this.gameDurationTicks && this.isSpawningActive) {
      // Stop spawning new asteroids but keep game running
      this.isSpawningActive = false;
      console.log('Time limit reached - stopping asteroid spawning');
    }
    
    // Check for game end - all asteroids destroyed after spawning stopped
    if (!this.isSpawningActive && this.asteroids.length === 0) {
      this.endGame();
    }
  }
  
  private updateBackgroundScroll(): void {
    if (!this.isGameActive) return;
    
    // Scroll pixels per tick (no deltaTime conversion needed)
    const scrollSpeed = this.currentFallSpeed;
    
    // Update scroll position (scroll downward)
    this.backgroundScrollY += scrollSpeed;
    
    // Update target positions for smooth tweening
    this.backgroundTargetY1 += scrollSpeed;
    this.backgroundTargetY2 += scrollSpeed;
    
    // Check if first background has moved completely off screen (below canvas)
    // When background1's top edge (y) is below the canvas bottom
    if (this.backgroundTargetY1 > GAME_SETTINGS.CANVAS_HEIGHT) {
      // Move first background to above the second background
      this.backgroundTargetY1 = this.backgroundTargetY2 - 3600;
    }
    
    // Check if second background has moved completely off screen (below canvas)
    // When background2's top edge (y) is below the canvas bottom
    if (this.backgroundTargetY2 > GAME_SETTINGS.CANVAS_HEIGHT) {
      // Move second background to above the first background
      this.backgroundTargetY2 = this.backgroundTargetY1 - 3600;
    }
    
    // Use tweens for smooth movement (33.33ms = 1 tick at 30 TPS)
    this.tweens.add({
      targets: this.background1,
      y: this.backgroundTargetY1,
      duration: GAME_SETTINGS.TICK_DURATION_MS,
      ease: 'Linear'
    });
    
    this.tweens.add({
      targets: this.background2,
      y: this.backgroundTargetY2,
      duration: GAME_SETTINGS.TICK_DURATION_MS,
      ease: 'Linear'
    });
  }

  private updateDifficulty(elapsedTicks: number): void {
    const difficultyProgress = elapsedTicks / this.gameDurationTicks;
    const playerCount = settingsStore.getPlayerCount();
    
    // Spawn rate: 60 ticks to 45 ticks over the course of the round
    const spawnRateReduction = difficultyProgress * 15; // 60 - 45 = 15
    const newSpawnRate = Math.max(45, Math.round(60 - spawnRateReduction));
    
    // Fall speed: 1.0 to 1.4 over the course of the round
    const fallSpeedIncrease = difficultyProgress * 0.4; // 1.4 - 1.0 = 0.4
    const newFallSpeed = 1.0 + fallSpeedIncrease;
    
    if (playerCount === 1) {
      // Singleplayer: update single values
      this.currentSpawnRateTicks = newSpawnRate;
      this.currentFallSpeed = newFallSpeed;
    } else {
      // Multiplayer: update separate values for each player
      this.currentSpawnRateTicksP1 = newSpawnRate;
      this.currentSpawnRateTicksP2 = newSpawnRate;
      this.currentFallSpeedP1 = newFallSpeed;
      this.currentFallSpeedP2 = newFallSpeed;
    }
  }

  private updateSymbolProgression(elapsedTicks: number): void {
    if (settingsStore.getInputMode() !== 'wand') return;
    
    // Start with TRIANGLE and NULL (0s)
    // ARROW: 15s (450 ticks)
    // STAR: 30s (900 ticks)
    
    if (elapsedTicks >= 900 && !this.symbolsUnlocked.includes('STAR')) {
      this.symbolsUnlocked.push('STAR');
    } else if (elapsedTicks >= 450 && !this.symbolsUnlocked.includes('ARROW')) {
      this.symbolsUnlocked.push('ARROW');
    }
  }

  private getSequenceLengthForWandMode(): number {
    const inputMode = settingsStore.getInputMode();
    
    if (inputMode === 'wand') {
      const elapsedTicks = this.currentTick - this.gameStartTick;
      
      // 1 spell: 0-600 ticks (0-20s)
      // 2 spells: 600-1200 ticks (20-40s)
      // 3 spells: 1200+ ticks (40s+) - removed 4 spells
      
      if (elapsedTicks < 600) return 1;
      if (elapsedTicks < 1200) return Math.random() < 0.7 ? 1 : 2; // Gradual intro to 2
      return Math.random() < 0.8 ? 2 : 3; // 80% chance for 2, 20% chance for 3 (rarer)
    }
    
    // Keyboard mode: existing random logic (also remove 4 for consistency)
    return Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 2 : 1; // 20% chance for 3, 40% for 2, 40% for 1
  }
  
  private updateAsteroids(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      const playerId = asteroid.getPlayerId();
      
      // Update text positions to follow physics body
      asteroid.updateTextPositions();
      
      // Get the correct ship for this asteroid's player
      const ship = this.getShipForPlayer(playerId);
      if (!ship) continue;
      
      const shipY = ship.y;
      const shipX = ship.x;
      
      // Calculate direction toward player using physics body position
      const asteroidX = asteroid.getPhysicsX();
      const asteroidY = asteroid.getPhysicsY();
      const dx = shipX - asteroidX;
      const dy = shipY - asteroidY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Get the correct fall speed for this player
      const fallSpeed = playerCount === 1 ? this.currentFallSpeed : 
                       (playerId === 0 ? this.currentFallSpeedP1 : this.currentFallSpeedP2);
      
      // Set velocity for smooth movement (pixels per tick * 30 TPS = pixels per second)
      if (distance > 0) {
        const velocityX = (dx / distance) * fallSpeed * 30; // Convert to pixels/second
        const velocityY = (dy / distance) * fallSpeed * 30; // Convert to pixels/second
        asteroid.setVelocity(velocityX, velocityY);
      }
      
      // Check for collision with ship using manual distance check
      // Collision should happen when asteroid edge touches ship edge
      // Ship radius (diagonal): ~45px, Asteroid radius: varies by scale (40 * scale)
      const asteroidRadius = 40 * asteroid.sprite.scaleX;
      const shipRadius = 45; // Approximate diagonal of ship collision box
      const collisionThreshold = asteroidRadius + shipRadius;

      const currentDistance = Math.sqrt(
        Math.pow(asteroidX - shipX, 2) + Math.pow(asteroidY - shipY, 2)
      );
      
      if (currentDistance < collisionThreshold) { // Dynamic collision radius
        // Asteroid hit the ship - delete with explosion
        asteroid.delete();
        this.asteroids.splice(i, 1);
        gameStore.onAsteroidHit(playerId); // Reset consecutive asteroids and multiplier to 1 for this player
        this.updateMultiplierDisplay();
        continue;
      }
      
      // Remove asteroids that have fallen off screen or moved too far
      if (asteroidY > GAME_SETTINGS.CANVAS_HEIGHT + 100 || 
          asteroidX < -100 || 
          asteroidX > GAME_SETTINGS.CANVAS_WIDTH + 100) {
        asteroid.destroy();
        this.asteroids.splice(i, 1);
      }
    }
  }
  
  private updateMissiles(): void {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      
      // Update missile
      missile.update();
      
      // Check collision with target asteroid
      const targetAsteroid = missile.getTargetAsteroid();
      if (targetAsteroid && targetAsteroid.body) {
        const distance = Math.sqrt(
          Math.pow(missile.x - targetAsteroid.x, 2) + 
          Math.pow(missile.y - targetAsteroid.y, 2)
        );
        
        if (distance < 30) { // Collision radius
          // Calculate impact point on asteroid edge
          const asteroidRadius = 40 * targetAsteroid.sprite.scaleX;
          const impactX = targetAsteroid.x + (missile.x - targetAsteroid.x) * (asteroidRadius / distance);
          const impactY = targetAsteroid.y + (missile.y - targetAsteroid.y) * (asteroidRadius / distance);
          
          // Missile hit asteroid - handle impact at edge point
          const shouldDestroy = targetAsteroid.handleMissileImpact(impactX, impactY);
          missile.destroy();
          this.missiles.splice(i, 1);
          
          // If asteroid should be destroyed, remove it from the array
          if (shouldDestroy) {
            const asteroidIndex = this.asteroids.indexOf(targetAsteroid);
            if (asteroidIndex > -1) {
              this.asteroids.splice(asteroidIndex, 1);
            }
          }
        }
      } else {
        // Target asteroid no longer exists, destroy missile
        missile.destroy();
        this.missiles.splice(i, 1);
      }
    }
  }
  
  private setupInput(): void {
    const keys = this.input.keyboard!;
    const playerCount = settingsStore.getPlayerCount();
    
    // Player 1 input (WASD)
    keys.on('keydown-W', () => this.handleKeyPress('W', 0));
    keys.on('keydown-A', () => this.handleKeyPress('A', 0));
    keys.on('keydown-S', () => this.handleKeyPress('S', 0));
    keys.on('keydown-D', () => this.handleKeyPress('D', 0));
    
    // Player 2 input (IJKL) - only in multiplayer
    if (playerCount === 2) {
      keys.on('keydown-I', () => this.handleKeyPress('I', 1));
      keys.on('keydown-J', () => this.handleKeyPress('J', 1));
      keys.on('keydown-K', () => this.handleKeyPress('K', 1));
      keys.on('keydown-L', () => this.handleKeyPress('L', 1));
    }
    
    // Enter key for results screen
    keys.on('keydown-ENTER', () => {
      if (this.resultsOverlay) {
        this.scene.start('Menu');
      }
    });
  }
  
  private handleKeyPress(key: string, playerId: PlayerId): void {
    if (!this.isGameActive) return;
    
    // Add to minimap only in keyboard mode
    if (settingsStore.getInputMode() === 'keyboard') {
      const playerCount = settingsStore.getPlayerCount();
      if (playerCount === 1 && this.minimap) {
        // Single minimap for singleplayer
        this.minimap.addKeyPress(key);
      } else if (playerCount === 2) {
        // Dual minimaps for multiplayer
        if (playerId === 0 && this.minimap1) {
          this.minimap1.addKeyPress(key);
        } else if (playerId === 1 && this.minimap2) {
          this.minimap2.addKeyPress(key);
        }
      }
    }
    
    // Find the closest asteroid that can accept this key for this player
    const nearestAsteroid = this.findNearestValidAsteroid(key, playerId);
    if (nearestAsteroid) {
      // Check if this will be the final key before processing
      const success = nearestAsteroid.processKeyPress(key);
      console.log(`Key ${key} pressed by player ${playerId}, success: ${success}, currentIndex: ${nearestAsteroid.currentIndex}, sequenceLength: ${nearestAsteroid.getSequenceLength()}`);
      if (success) {
        // Shoot missile for every successful key press
        console.log(`Shooting missile for key ${key} by player ${playerId}`);
        this.shootMissileAtAsteroidDelayed(nearestAsteroid, playerId);
        
        // Check if sequence is now complete
        if (nearestAsteroid.isComplete()) {
          // Award points and update streak for completion
          this.handleCorrectKeyPress(nearestAsteroid, playerId);
        }
      } else {
        // Brief negative feedback
        this.handleIncorrectKeyPress();
      }
    } else {
      // Brief negative feedback for wrong key
      this.handleIncorrectKeyPress();
    }
  }
  
  private findNearestValidAsteroid(key: string, playerId: PlayerId): Asteroid | null {
    // Find asteroids that can accept this key and belong to this player
    const validAsteroids = this.asteroids.filter(asteroid => 
      asteroid.canAcceptKey(key) && asteroid.getPlayerId() === playerId
    );
    
    if (validAsteroids.length === 0) return null;
    
    // Find the one with the lowest bottom Y position (closest to player)
    return validAsteroids.reduce((closest, current) => {
      // Get the bottom Y position of each asteroid sprite
      const closestBottomY = closest.y + (closest.sprite.displayHeight / 2);
      const currentBottomY = current.y + (current.sprite.displayHeight / 2);
      
      // Return the one with the highest bottom Y (lowest on screen, closest to player)
      return currentBottomY > closestBottomY ? current : closest;
    });
  }
  
  private setupEventListeners(): void {
    // Listen for stroke updates for minimap
    eventBus.on('hud:stroke', (_data: { playerId: PlayerId; points: any[] }) => {
      // Update minimap with stroke data if needed
    });
  }
  
  private handleCorrectKeyPress(asteroid: Asteroid, playerId: PlayerId): void {
    const sequenceLength = asteroid.getSequenceLength();
    const baseScore = this.getBaseScore(sequenceLength);
    
    // Update score and multiplier based on consecutive asteroids
    gameStore.updateScore(playerId, baseScore);
    gameStore.onAsteroidDestroyed(playerId);
    
    // Update displays
    this.updateScoreDisplay();
    this.updateMultiplierDisplay();
    
    // Don't remove asteroid from array here - let the missile collision handle it
    // The asteroid will be removed when the final missile hits it
  }
  
  private shootMissileAtAsteroidDelayed(asteroid: Asteroid, playerId: PlayerId): void {
    // Calculate rotation angle to asteroid
    const rotationAngle = this.calculateRotationToAsteroid(asteroid, playerId);
    
    // Make ship face the asteroid with smooth tweening
    this.makeShipFaceAsteroid(rotationAngle, playerId);
    
    // Wait for ship rotation to complete, then shoot missile
    this.time.delayedCall(100, () => { // 100ms matches the tween duration
      this.shootMissileAtAsteroid(asteroid, rotationAngle, playerId);
    });
  }

  private shootMissileAtAsteroid(asteroid: Asteroid, rotationAngle: number, playerId: PlayerId): void {
    // Get the correct ship for this player
    const ship = this.getShipForPlayer(playerId);
    if (!ship) return;
    
    // Calculate missile spawn position (center/head of the ship)
    const shipX = ship.x;
    const shipY = ship.y;
    
    // Try spawning from the ship's center first to debug positioning
    const centerX = shipX;
    const centerY = shipY;
    
    console.log(`Ship position for player ${playerId}: (${shipX}, ${shipY}), Missile spawn: (${centerX}, ${centerY}), Rotation: ${rotationAngle}`);
    
    // Create missile with the calculated rotation
    const missile: Missile = new Missile(this, centerX, centerY, asteroid, rotationAngle);
    this.missiles.push(missile);
  }
  
  private getShipForPlayer(playerId: PlayerId): Phaser.GameObjects.Image | null {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      return this.staticShip;
    } else {
      return playerId === 0 ? this.player1Ship : this.player2Ship;
    }
  }

  private calculateRotationToAsteroid(asteroid: Asteroid, playerId: PlayerId): number {
    // Aim at the center of the asteroid sprite, not the physics body
    const asteroidX = asteroid.x;
    const asteroidY = asteroid.y;
    const ship = this.getShipForPlayer(playerId);
    if (!ship) return 0;
    
    const shipX = ship.x;
    const shipY = ship.y;
    
    // Calculate angle to asteroid center
    const angle = Math.atan2(asteroidY - shipY, asteroidX - shipX);
    
    // Adjust angle by 90 degrees (π/2 radians) to fix ship orientation
    const adjustedAngle = angle + Math.PI / 2;
    
    return adjustedAngle;
  }
  
  private makeShipFaceAsteroid(targetRotation: number, playerId: PlayerId): void {
    // Get the correct ship for this player
    const ship = this.getShipForPlayer(playerId);
    if (!ship) return;
    
    // Tween ship rotation to target angle with high speed
    this.tweens.add({
      targets: ship,
      rotation: targetRotation,
      duration: 100, // 100ms for faster rotation
      ease: 'Power2.easeOut'
    });
  }
  
  private updateScoreDisplay(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer display
      const scoreText = (this as any).scoreText;
      if (scoreText) {
        scoreText.setText(`SCORE: ${gameStore.players[0].score}`);
      }
    } else {
      // Multiplayer displays
      const scoreText1 = (this as any).scoreText1;
      const scoreText2 = (this as any).scoreText2;
      
      if (scoreText1) {
        scoreText1.setText(`P1: ${gameStore.players[0].score}`);
      }
      if (scoreText2) {
        scoreText2.setText(`P2: ${gameStore.players[1].score}`);
      }
    }
  }
  
  private updateMultiplierDisplay(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer display
      const multiplierText = (this as any).multiplierText;
      if (multiplierText) {
        const multiplier = gameStore.players[0].mult;
        multiplierText.setText('★'.repeat(multiplier));
      }
    } else {
      // Multiplayer displays
      const multiplierText1 = (this as any).multiplierText1;
      const multiplierText2 = (this as any).multiplierText2;
      
      if (multiplierText1) {
        const multiplier1 = gameStore.players[0].mult;
        multiplierText1.setText('★'.repeat(multiplier1));
      }
      if (multiplierText2) {
        const multiplier2 = gameStore.players[1].mult;
        multiplierText2.setText('★'.repeat(multiplier2));
      }
    }
  }
  
  
  private handleIncorrectKeyPress(): void {
    // Incorrect key press doesn't change multiplier anymore
    // Multiplier only changes based on consecutive asteroids destroyed
  }

  private handleWandInput(): void {
    if (!this.modeInput) return;
    
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer wand handling
      const spell = this.modeInput.getCurrentSpell();
      if (spell !== Spell.NONE) {
        // Consume the spell immediately (removes from game logic but keeps in visualizer)
        const consumedSpell = visualizerManager.consumeSpell();
        
        // Map spell to sequence string
        const keyMapping: Record<Spell, string> = {
          [Spell.NULL]: 'NULL',
          [Spell.STAR]: 'STAR',
          [Spell.TRIANGLE]: 'TRIANGLE',
          [Spell.ARROW]: 'ARROW',
          [Spell.NONE]: ''
        };
        
        const key = keyMapping[consumedSpell];
        if (key) {
          this.handleKeyPress(key, 0); // Player 0 in singleplayer
        }
      }
    } else {
      // Multiplayer wand handling - use simpler approach like WandCalibrationScene
      const keyMapping: Record<Spell, string> = {
        [Spell.NULL]: 'NULL',
        [Spell.STAR]: 'STAR',
        [Spell.TRIANGLE]: 'TRIANGLE',
        [Spell.ARROW]: 'ARROW',
        [Spell.NONE]: ''
      };
      
      // Check player 1 wand - use simpler presence check
      const player1WandPresent = visualizerManager.isWandPresent(); // Use general presence check
      if (player1WandPresent) {
        const wand1Spell = visualizerManager.getCurrentSpell();
        if (wand1Spell !== Spell.NONE) {
          const consumedSpell = visualizerManager.consumeSpell();
          const key = keyMapping[consumedSpell];
          if (key) {
            console.log(`Player 1 wand spell detected: ${key}`);
            this.handleKeyPress(key, 0);
          }
        }
      }
      
      // Check player 2 wand - use simpler presence check  
      const player2WandPresent = visualizerManager.isWand2Present(); // Use general presence check
      if (player2WandPresent) {
        const wand2Spell = visualizerManager.getWand2CurrentSpell();
        if (wand2Spell !== Spell.NONE) {
          const consumedSpell = visualizerManager.consumeWand2Spell();
          const key = keyMapping[consumedSpell];
          if (key) {
            console.log(`Player 2 wand spell detected: ${key}`);
            this.handleKeyPress(key, 1);
          }
        }
      }
    }
  }

  private updateVisualizerData(): void {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer visualizer
      if (!this.visualizer || !this.modeInput) return;
      
      // Get data from the singleton visualizer manager
      const points = visualizerManager.getPoints();
      const currentPosition = visualizerManager.getCurrentPosition();
      const visualizerSpell = visualizerManager.getVisualizerSpell(); // Use visualizer spell for display
      
      // Update the visualizer widget with the latest data
      this.visualizer.setPoints(points);
      this.visualizer.setCurrentPosition(currentPosition);
      this.visualizer.showSpell(visualizerSpell);
    } else {
      // Multiplayer visualizers - update both unconditionally like WandCalibrationScene
      if (!this.modeInput) return;
      
      // Update visualizer 1 (orange - player 1) - always update like in calibration
      if (this.visualizer1) {
        const wand1Points = visualizerManager.getPlayer1Points();
        const wand1Position = visualizerManager.getPlayer1CurrentPosition();
        const wand1Spell = visualizerManager.getVisualizerSpell(); // Use the main visualizer spell for player 1
        
        this.visualizer1.setPoints(wand1Points);
        this.visualizer1.setCurrentPosition(wand1Position);
        this.visualizer1.showSpell(wand1Spell);
      }
      
      // Update visualizer 2 (purple - player 2) - always update like in calibration
      if (this.visualizer2) {
        const wand2Points = visualizerManager.getPlayer2Points();
        const wand2Position = visualizerManager.getPlayer2CurrentPosition();
        const wand2Spell = visualizerManager.getWand2VisualizerSpell();
        
        this.visualizer2.setPoints(wand2Points);
        this.visualizer2.setCurrentPosition(wand2Position);
        this.visualizer2.showSpell(wand2Spell);
      }
    }
  }
  
  private getBaseScore(sequenceLength: number): number {
    switch (sequenceLength) {
      case 1: return 25;
      case 2: return 50;
      case 3: return 100;
      case 4: return 200;
      default: return 25;
    }
  }
  
  private endGame(): void {
    this.isGameActive = false;
    this.isSpawningActive = false;
    
    console.log('Game ended - all asteroids destroyed');
    
    // Show game over screen immediately
    this.showGameOver('TIME UP!');
  }
  
  private showGameOver(reason: string): void {
    const playerCount = settingsStore.getPlayerCount();
    
    // Create results overlay
    this.resultsOverlay = this.add.container(GAME_SETTINGS.CANVAS_WIDTH / 2, GAME_SETTINGS.CANVAS_HEIGHT / 2);
    
    // Background
    const bg = this.add.rectangle(0, 0, 600, 400, 0x000000, 0.8);
    bg.setStrokeStyle(4, GAME_SETTINGS.COLORS.WHITE);
    this.resultsOverlay.add(bg);
    
    // Title
    const title = BitmapTextHelper.createTitleText(
      this,
      0,
      -150,
      'GAME OVER',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.resultsOverlay.add(title);
    
    // Reason
    const reasonText = BitmapTextHelper.createHUDText(
      this,
      0,
      -100,
      reason,
      GAME_SETTINGS.COLORS.RED
    );
    this.resultsOverlay.add(reasonText);
    
    if (playerCount === 1) {
      // Singleplayer results
      const finalScore = gameStore.players[0].score;
      const finalMultiplier = gameStore.players[0].mult;
      
      // Final score
      const scoreText = BitmapTextHelper.createHUDText(
        this,
        0,
        -50,
        `FINAL SCORE: ${finalScore}`,
        GAME_SETTINGS.COLORS.ORANGE
      );
      this.resultsOverlay.add(scoreText);
      
      // Multiplier stars
      const starsText = BitmapTextHelper.createHUDText(
        this,
        0,
        0,
        `MULTIPLIER: ${'★'.repeat(finalMultiplier)}`,
        GAME_SETTINGS.COLORS.YELLOW
      );
      this.resultsOverlay.add(starsText);
      
      // Check if score qualifies for leaderboard
      const isHighScore = leaderboardStore.isHighScore(finalScore);
      
      // Instructions
      const instructions = BitmapTextHelper.createHUDText(
        this,
        0,
        100,
        isHighScore ? 'PRESS ENTER TO ENTER NAME' : 'PRESS ENTER TO RETURN TO MENU',
        GAME_SETTINGS.COLORS.WHITE
      );
      this.resultsOverlay.add(instructions);
      
      this.resultsOverlay.setDepth(1000);
      
      // Set up input handling for game over
      this.input.keyboard?.once('keydown-ENTER', () => {
        if (isHighScore) {
          this.scene.start('NameEntry', { score: finalScore });
        } else {
          this.scene.start('Menu');
        }
      });
    } else {
      // Multiplayer results
      const score1 = gameStore.players[0].score;
      const score2 = gameStore.players[1].score;
      const winner = score1 >= score2 ? 0 : 1;
      const winnerScore = Math.max(score1, score2);
      
      // Player 1 score
      const scoreText1 = BitmapTextHelper.createHUDText(
        this,
        0,
        -50,
        `PLAYER 1: ${score1}`,
        GAME_SETTINGS.COLORS.ORANGE
      );
      this.resultsOverlay.add(scoreText1);
      
      // Player 2 score
      const scoreText2 = BitmapTextHelper.createHUDText(
        this,
        0,
        -10,
        `PLAYER 2: ${score2}`,
        GAME_SETTINGS.COLORS.PURPLE
      );
      this.resultsOverlay.add(scoreText2);
      
      // Winner announcement
      const winnerText = BitmapTextHelper.createHUDText(
        this,
        0,
        30,
        `PLAYER ${winner + 1} WINS!`,
        winner === 0 ? GAME_SETTINGS.COLORS.ORANGE : GAME_SETTINGS.COLORS.PURPLE
      );
      this.resultsOverlay.add(winnerText);
      
      // Check if winner's score qualifies for leaderboard
      const isHighScore = leaderboardStore.isHighScore(winnerScore);
      
      // Instructions
      const instructions = BitmapTextHelper.createHUDText(
        this,
        0,
        100,
        isHighScore ? 'PRESS ENTER TO ENTER WINNER NAME' : 'PRESS ENTER TO RETURN TO MENU',
        GAME_SETTINGS.COLORS.WHITE
      );
      this.resultsOverlay.add(instructions);
      
      this.resultsOverlay.setDepth(1000);
      
      // Set up input handling for game over
      this.input.keyboard?.once('keydown-ENTER', () => {
        if (isHighScore) {
          this.scene.start('NameEntry', { score: winnerScore });
        } else {
          this.scene.start('Menu');
        }
      });
    }
  }


}
