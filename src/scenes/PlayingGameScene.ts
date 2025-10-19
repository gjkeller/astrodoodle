import { BitmapTextHelper } from '../ui/bitmapText';
import { ProgressBar, Minimap } from '../ui';
import { Asteroid } from '../gameplay';
import { Missile } from '../gameplay/missile';
import { gameStore, eventBus } from '../core';
import { GAME_SETTINGS, msToTicks } from '../core/settings';
import type { PlayerId } from '../types/global';

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
  private minimap: Minimap;
  private fpsText: Phaser.GameObjects.Text | null = null;
  
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
  
  // Difficulty progression
  private currentSpawnRateTicks: number = msToTicks(2000); // Start with 2 seconds = 60 ticks
  private currentFallSpeed: number = 1.67; // pixels per tick (50 pixels/second / 30 ticks/second)
  
  constructor() {
    super('PlayingGame');
  }
  
  create(): void {
    // Create explosion animation
    this.createExplosionAnimation();
    
    this.createBackground();
    this.createProgressBar();
    this.createStaticShip();
    this.createPlayerHUD();
    this.createMinimap();
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
    // Create a static ship positioned lower than center
    this.staticShip = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT * 0.7, // Move ship down to 70% of screen height
      'orange-ship'
    );
    this.staticShip.setScale(0.8);
    this.staticShip.setDepth(100);
    
    // Enable physics body for collision detection
    this.physics.world.enable(this.staticShip);
    const shipBody = this.staticShip.body as Phaser.Physics.Arcade.Body;

    // Ship is triangular, roughly 70px wide and 90px tall at 0.8 scale
    // Use a smaller collision box that fits the ship body better
    // Account for the 0.8 scale: 70*0.8=56, 90*0.8=72
    shipBody.setSize(56, 72); // Width: 70*0.8, Height: 90*0.8
    shipBody.setOffset(-28, -36); // Center the collision box (half of width and height)
    shipBody.setImmovable(true); // Ship doesn't move
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
  }
  
  private spawnAsteroid(): void {
    if (!this.isSpawningActive) return;
    
    console.log('spawnAsteroid called, isSpawningActive:', this.isSpawningActive);
    
    // Generate random WASD sequence (1-4 characters)
    const sequenceLength = Math.random() < 0.3 ? 4 : Math.random() < 0.5 ? 3 : Math.random() < 0.7 ? 2 : 1;
    const sequence = this.generateWASDSequence(sequenceLength);
    
    // Spawn first asteroid with collision detection
    const spawnX = this.findValidSpawnPosition();
    console.log('spawnX:', spawnX);
    if (spawnX !== null) {
      const asteroid = new Asteroid(this, spawnX, -100, 'center', sequence);
      this.asteroids.push(asteroid);
      console.log('Asteroid spawned, total asteroids:', this.asteroids.length);
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
      this.ticksSinceLastSpawn++;
      
      if (this.ticksSinceLastSpawn >= this.currentSpawnRateTicks) {
        console.log('Spawning asteroid, ticksSinceLastSpawn:', this.ticksSinceLastSpawn, 'currentSpawnRateTicks:', this.currentSpawnRateTicks);
        this.spawnAsteroid();
        this.ticksSinceLastSpawn = 0;
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
    
    // Increase spawn rate (faster spawning)
    // OLD: 2000ms to 500ms -> NEW: 60 ticks to 15 ticks (30 TPS)
    const newSpawnRate = Math.max(15, 60 - Math.floor(difficultyProgress * 45));
    this.currentSpawnRateTicks = newSpawnRate;
    
    // Increase fall speed
    // OLD: 50 to 150 pixels/second -> NEW: 1.67 to 5 pixels/tick (30 TPS)
    this.currentFallSpeed = 1.67 + (difficultyProgress * 3.33);
  }
  
  private updateAsteroids(): void {
    const shipY = this.staticShip.y;
    const shipX = this.staticShip.x;
    
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      
      // Update text positions to follow physics body
      asteroid.updateTextPositions();
      
      // Calculate direction toward player using physics body position
      const asteroidX = asteroid.getPhysicsX();
      const asteroidY = asteroid.getPhysicsY();
      const dx = shipX - asteroidX;
      const dy = shipY - asteroidY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Set velocity for smooth movement (pixels per tick * 30 TPS = pixels per second)
      if (distance > 0) {
        const velocityX = (dx / distance) * this.currentFallSpeed * 30; // Convert to pixels/second
        const velocityY = (dy / distance) * this.currentFallSpeed * 30; // Convert to pixels/second
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
        gameStore.onAsteroidHit(0); // Reset consecutive asteroids and multiplier to 1
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
      // Check if this will be the final key before processing
      const success = nearestAsteroid.processKeyPress(key);
      console.log(`Key ${key} pressed, success: ${success}, currentIndex: ${nearestAsteroid.currentIndex}, sequenceLength: ${nearestAsteroid.getSequenceLength()}`);
      if (success) {
        // Shoot missile for every successful key press
        console.log(`Shooting missile for key ${key}`);
        this.shootMissileAtAsteroidDelayed(nearestAsteroid);
        
        // Check if sequence is now complete
        if (nearestAsteroid.isComplete()) {
          // Award points and update streak for completion
          this.handleCorrectKeyPress(nearestAsteroid);
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
  
  private findNearestValidAsteroid(key: string): Asteroid | null {
    // Find asteroids that can accept this key
    const validAsteroids = this.asteroids.filter(asteroid => 
      asteroid.canAcceptKey(key)
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
  
  private handleCorrectKeyPress(asteroid: Asteroid): void {
    const sequenceLength = asteroid.getSequenceLength();
    const baseScore = this.getBaseScore(sequenceLength);
    
    // Update score and multiplier based on consecutive asteroids
    gameStore.updateScore(0, baseScore);
    gameStore.onAsteroidDestroyed(0);
    
    // Update displays
    this.updateScoreDisplay();
    this.updateMultiplierDisplay();
    
    // Don't remove asteroid from array here - let the missile collision handle it
    // The asteroid will be removed when the final missile hits it
  }
  
  private shootMissileAtAsteroidDelayed(asteroid: Asteroid): void {
    // Calculate rotation angle to asteroid
    const rotationAngle = this.calculateRotationToAsteroid(asteroid);
    
    // Make ship face the asteroid with smooth tweening
    this.makeShipFaceAsteroid(rotationAngle);
    
    // Wait for ship rotation to complete, then shoot missile
    this.time.delayedCall(100, () => { // 100ms matches the tween duration
      this.shootMissileAtAsteroid(asteroid, rotationAngle);
    });
  }

  private shootMissileAtAsteroid(asteroid: Asteroid, rotationAngle?: number): void {
    // Calculate rotation angle to asteroid if not provided
    if (rotationAngle === undefined) {
      rotationAngle = this.calculateRotationToAsteroid(asteroid);
    }
    
    // Calculate missile spawn position (center/head of the ship)
    const shipX = this.staticShip.x;
    const shipY = this.staticShip.y;
    
    // Try spawning from the ship's center first to debug positioning
    const centerX = shipX;
    const centerY = shipY;
    
    console.log(`Ship position: (${shipX}, ${shipY}), Missile spawn: (${centerX}, ${centerY}), Rotation: ${rotationAngle}`);
    
    // Create missile with the calculated rotation
    const missile: Missile = new Missile(this, centerX, centerY, asteroid, rotationAngle);
    this.missiles.push(missile);
  }
  
  private calculateRotationToAsteroid(asteroid: Asteroid): number {
    // Aim at the center of the asteroid sprite, not the physics body
    const asteroidX = asteroid.x;
    const asteroidY = asteroid.y;
    const shipX = this.staticShip.x;
    const shipY = this.staticShip.y;
    
    // Calculate angle to asteroid center
    const angle = Math.atan2(asteroidY - shipY, asteroidX - shipX);
    
    // Adjust angle by 90 degrees (π/2 radians) to fix ship orientation
    const adjustedAngle = angle + Math.PI / 2;
    
    return adjustedAngle;
  }
  
  private makeShipFaceAsteroid(targetRotation: number): void {
    // Tween ship rotation to target angle with high speed
    this.tweens.add({
      targets: this.staticShip,
      rotation: targetRotation,
      duration: 100, // 100ms for faster rotation
      ease: 'Power2.easeOut'
    });
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
