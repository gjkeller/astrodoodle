import { BitmapTextHelper } from '../ui/bitmapText';
import { ProgressBar, Minimap } from '../ui';
import { Asteroid } from '../gameplay';
import { gameStore, eventBus } from '../core';
import { GAME_SETTINGS } from '../core/settings';
import type { PlayerId } from '../types/global';

export default class PlayingGameScene extends Phaser.Scene {
  private background1: Phaser.GameObjects.Image;
  private background2: Phaser.GameObjects.Image;
  private backgroundScrollY: number = 0;
  private progressBar: ProgressBar;
  private asteroids: Asteroid[] = [];
  private staticShip: Phaser.GameObjects.Image;
  private minimap: Minimap;
  
  // Game timing
  private gameStartTime: number = 0;
  private gameDuration: number = 60000; // 60 seconds
  private isGameActive: boolean = false;
  private isSpawningActive: boolean = false;
  private resultsOverlay: Phaser.GameObjects.Container | null = null;
  
  // Difficulty progression
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private currentSpawnRate: number = 2000; // Start with 2 seconds
  private currentFallSpeed: number = 50; // pixels per second
  
  constructor() {
    super('PlayingGame');
  }
  
  create(): void {
    this.createBackground();
    this.createProgressBar();
    this.createStaticShip();
    this.createPlayerHUD();
    this.createMinimap();
    this.setupInput();
    this.setupEventListeners();
    
    // Don't start the game immediately - wait for user input
    console.log('PlayingGameScene created, waiting for game start...');
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
    
    // Add "Press SPACE to start" message
    const startMessage = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'PRESS SPACE TO START',
      GAME_SETTINGS.COLORS.WHITE
    );
    startMessage.setDepth(200);
    this.add.existing(startMessage);
    
    // Store reference to hide it when game starts
    (this as any).startMessage = startMessage;
  }
  
  private createStaticShip(): void {
    // Create a static ship positioned lower than center
    this.staticShip = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT * 0.7, // Move ship down to 70% of screen height
      'orange-ship'
    );
    this.staticShip.setScale(0.8);
    this.staticShip.setDepth(100);
  }
  
  private createPlayerHUD(): void {
    // Create score display at the top center
    this.createScoreDisplay();
    
    // Create multiplier display at top right
    this.createMultiplierDisplay();
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
      GAME_SETTINGS.COLORS.YELLOW
    );
    multiplierText.setDepth(200);
    this.add.existing(multiplierText);
    
    // Store reference for updates
    (this as any).multiplierText = multiplierText;
  }
  
  private createMinimap(): void {
    // Create minimap in bottom-left corner, above the progress bar
    this.minimap = new Minimap(this, 100, GAME_SETTINGS.CANVAS_HEIGHT - 140);
  }
  
  private startGame(): void {
    this.gameStartTime = this.time.now;
    this.isGameActive = true;
    this.isSpawningActive = true;
    
    // Hide the start message
    if ((this as any).startMessage) {
      (this as any).startMessage.destroy();
    }
    
    console.log('Game started, isGameActive:', this.isGameActive);
    
    // Start asteroid spawning
    this.startAsteroidSpawning();
    
    // Start the main game loop
    this.time.addEvent({
      delay: 16, // ~60 FPS
      callback: this.updateGame,
      callbackScope: this,
      loop: true
    });
  }
  
  private startAsteroidSpawning(): void {
    // Debug logging removed
    this.spawnTimer = this.time.addEvent({
      delay: this.currentSpawnRate,
      callback: this.spawnAsteroid,
      callbackScope: this,
      loop: true
    });
  }
  
  private spawnAsteroid(): void {
    if (!this.isSpawningActive) return;
    
    // Generate random WASD sequence (1-4 characters)
    const sequenceLength = Math.random() < 0.3 ? 4 : Math.random() < 0.5 ? 3 : Math.random() < 0.7 ? 2 : 1;
    const sequence = this.generateWASDSequence(sequenceLength);
    
    // Spawn first asteroid with collision detection
    const spawnX = this.findValidSpawnPosition();
    if (spawnX !== null) {
      const asteroid = new Asteroid(this, spawnX, -100, 'center', sequence);
      this.asteroids.push(asteroid);
    }
    
    // Chance for multiple asteroids to spawn at once
    if (Math.random() < 0.15) { // 15% chance
      const secondSequence = this.generateWASDSequence(sequenceLength);
      const secondSpawnX = this.findValidSpawnPosition();
      if (secondSpawnX !== null) {
        const secondAsteroid = new Asteroid(this, secondSpawnX, -100, 'center', secondSequence);
        this.asteroids.push(secondAsteroid);
      }
    }
  }
  
  private findValidSpawnPosition(): number | null {
    const minDistance = 60; // Increased minimum distance between asteroids
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random X position
      const candidateX = 100 + Math.random() * (GAME_SETTINGS.CANVAS_WIDTH - 200);
      
      // Check if this position is far enough from existing asteroids
      let isValidPosition = true;
      for (const existingAsteroid of this.asteroids) {
        const distance = Math.abs(candidateX - existingAsteroid.x);
        if (distance < minDistance) {
          isValidPosition = false;
          break;
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
  
  private generateWASDSequence(length: number): string {
    const keys = ['W', 'A', 'S', 'D'];
    const sequence: string[] = [];
    
    for (let i = 0; i < length; i++) {
      sequence.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    
    return sequence.join(' ');
  }
  
  private updateGame(): void {
    if (!this.isGameActive) return;
    
    const elapsed = this.time.now - this.gameStartTime;
    const progress = Math.min(elapsed / this.gameDuration, 1);
    
    // Update progress bar based on time
    this.progressBar.setProgress(0, progress);
    
    // Update difficulty over time (only while spawning is active)
    if (this.isSpawningActive) {
      this.updateDifficulty(elapsed);
    }
    
    // Update asteroids (always continue until game ends)
    this.updateAsteroids();
    
    // Update background scroll
    this.updateBackgroundScroll();
    
    // Check if time limit has expired
    if (elapsed >= this.gameDuration && this.isSpawningActive) {
      // Stop spawning new asteroids but keep game running
      this.isSpawningActive = false;
      if (this.spawnTimer) {
        this.spawnTimer.destroy();
        this.spawnTimer = null;
      }
      console.log('Time limit reached - stopping asteroid spawning');
    }
    
    // Check for game end - all asteroids destroyed after spawning stopped
    if (!this.isSpawningActive && this.asteroids.length === 0) {
      this.endGame();
    }
  }
  
  private updateBackgroundScroll(): void {
    if (!this.isGameActive) return;
    
    // Scroll the background downward at the exact same speed as asteroids fall
    const deltaTime = 16; // Assume 60 FPS for consistent movement
    const scrollSpeed = this.currentFallSpeed * (deltaTime / 1000);
    
    // Update scroll position (scroll downward)
    this.backgroundScrollY += scrollSpeed;
    
    // Move both backgrounds downward
    this.background1.y += scrollSpeed;
    this.background2.y += scrollSpeed;
    
    // Check if first background has moved completely off screen (below canvas)
    // When background1's top edge (y) is below the canvas bottom
    if (this.background1.y > GAME_SETTINGS.CANVAS_HEIGHT) {
      // Move first background to above the second background
      this.background1.y = this.background2.y - 3600;
    }
    
    // Check if second background has moved completely off screen (below canvas)
    // When background2's top edge (y) is below the canvas bottom
    if (this.background2.y > GAME_SETTINGS.CANVAS_HEIGHT) {
      // Move second background to above the first background
      this.background2.y = this.background1.y - 3600;
    }
  }

  private updateDifficulty(elapsed: number): void {
    const difficultyProgress = elapsed / this.gameDuration;
    
    // Increase spawn rate (faster spawning)
    const newSpawnRate = Math.max(500, 2000 - (difficultyProgress * 1500));
    
    // Only update if the rate has changed significantly
    if (Math.abs(newSpawnRate - this.currentSpawnRate) > 50) {
      this.currentSpawnRate = newSpawnRate;
      
      // Restart spawn timer with new rate if it exists
      if (this.spawnTimer) {
        this.spawnTimer.destroy();
        this.startAsteroidSpawning();
      }
    }
    
    // Increase fall speed
    this.currentFallSpeed = 50 + (difficultyProgress * 100);
  }
  
  private updateAsteroids(): void {
    const deltaTime = 16; // Assume 60 FPS for consistent movement
    const shipY = this.staticShip.y;
    const shipX = this.staticShip.x;
    const collisionRadius = 50; // Collision detection radius
    
    // Debug logging removed to reduce console spam
    
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      
      // Calculate direction toward player
      const dx = shipX - asteroid.x;
      const dy = shipY - asteroid.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Normalize direction and apply speed
      if (distance > 0) {
        const moveX = (dx / distance) * this.currentFallSpeed * (deltaTime / 1000);
        const moveY = (dy / distance) * this.currentFallSpeed * (deltaTime / 1000);
        
        asteroid.x += moveX;
        asteroid.y += moveY;
      }
      
      // Check for collision with ship
      const currentDistance = Math.sqrt(
        Math.pow(asteroid.x - shipX, 2) + Math.pow(asteroid.y - shipY, 2)
      );
      
      if (currentDistance < collisionRadius) {
        // Asteroid hit the ship - remove it and reset multiplier
        asteroid.destroy();
        this.asteroids.splice(i, 1);
        gameStore.onAsteroidHit(0); // Reset consecutive asteroids and multiplier to 1
        this.updateMultiplierDisplay();
        continue;
      }
      
      // Remove asteroids that have fallen off screen or moved too far
      if (asteroid.y > GAME_SETTINGS.CANVAS_HEIGHT + 100 || 
          asteroid.x < -100 || 
          asteroid.x > GAME_SETTINGS.CANVAS_WIDTH + 100) {
        asteroid.destroy();
        this.asteroids.splice(i, 1);
      }
    }
  }
  
  private setupInput(): void {
    const keys = this.input.keyboard!;
    
    // Space key to start the game
    keys.on('keydown-SPACE', () => {
      if (!this.isGameActive && !this.resultsOverlay) {
        this.startGame();
      }
    });
    
    // WASD input for asteroid sequences
    keys.on('keydown-W', () => this.handleKeyPress('W'));
    keys.on('keydown-A', () => this.handleKeyPress('A'));
    keys.on('keydown-S', () => this.handleKeyPress('S'));
    keys.on('keydown-D', () => this.handleKeyPress('D'));
    
    // Enter key for results screen
    keys.on('keydown-ENTER', () => {
      if (this.resultsOverlay) {
        this.scene.start('Menu');
      }
    });
  }
  
  private handleKeyPress(key: string): void {
    if (!this.isGameActive) return;
    
    // Add to minimap
    this.minimap.addKeyPress(key);
    
    // Find the closest asteroid that can accept this key
    const nearestAsteroid = this.findNearestValidAsteroid(key);
    if (nearestAsteroid) {
      const success = nearestAsteroid.processKeyPress(key);
      if (success) {
        // Award points and update streak
        this.handleCorrectKeyPress(nearestAsteroid);
      } else {
        // Brief negative feedback
        this.handleIncorrectKeyPress();
      }
    } else {
      // Brief negative feedback for wrong key
      this.handleIncorrectKeyPress();
    }
  }
  
  private findNearestValidAsteroid(key: string): Asteroid | null {
    // Find asteroids that can accept this key
    const validAsteroids = this.asteroids.filter(asteroid => 
      asteroid.canAcceptKey(key)
    );
    
    if (validAsteroids.length === 0) return null;
    
    // Find the closest one to the player
    const shipX = this.staticShip.x;
    const shipY = this.staticShip.y;
    
    return validAsteroids.reduce((closest, current) => {
      const closestDistance = Math.sqrt(
        Math.pow(closest.x - shipX, 2) + Math.pow(closest.y - shipY, 2)
      );
      const currentDistance = Math.sqrt(
        Math.pow(current.x - shipX, 2) + Math.pow(current.y - shipY, 2)
      );
      
      return currentDistance < closestDistance ? current : closest;
    });
  }
  
  private setupEventListeners(): void {
    // Listen for stroke updates for minimap
    eventBus.on('hud:stroke', (_data: { playerId: PlayerId; points: any[] }) => {
      // Update minimap with stroke data if needed
    });
  }
  
  private handleCorrectKeyPress(asteroid: Asteroid): void {
    const sequenceLength = asteroid.getSequenceLength();
    const baseScore = this.getBaseScore(sequenceLength);
    
    // Update score and multiplier based on consecutive asteroids
    gameStore.updateScore(0, baseScore);
    gameStore.onAsteroidDestroyed(0);
    
    // Update displays
    this.updateScoreDisplay();
    this.updateMultiplierDisplay();
    
    // Remove the completed asteroid
    const index = this.asteroids.indexOf(asteroid);
    if (index > -1) {
      this.asteroids.splice(index, 1);
      asteroid.destroy();
    }
  }
  
  private updateScoreDisplay(): void {
    const scoreText = (this as any).scoreText;
    if (scoreText) {
      scoreText.setText(`SCORE: ${gameStore.players[0].score}`);
    }
  }
  
  private updateMultiplierDisplay(): void {
    const multiplierText = (this as any).multiplierText;
    if (multiplierText) {
      const multiplier = gameStore.players[0].mult;
      multiplierText.setText('★'.repeat(multiplier));
    }
  }
  
  
  private handleIncorrectKeyPress(): void {
    // Incorrect key press doesn't change multiplier anymore
    // Multiplier only changes based on consecutive asteroids destroyed
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
    
    // Stop spawning (should already be stopped, but just in case)
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }
    
    console.log('Game ended - all asteroids destroyed');
    
    // Show game over screen immediately
    this.showGameOver('TIME UP!');
  }
  
  private showGameOver(reason: string): void {
    const finalScore = gameStore.players[0].score;
    const finalMultiplier = gameStore.players[0].mult;
    
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
    
    // Instructions
    const instructions = BitmapTextHelper.createHUDText(
      this,
      0,
      100,
      'PRESS ENTER TO RETURN TO MENU',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.resultsOverlay.add(instructions);
    
    this.resultsOverlay.setDepth(1000);
  }

}
