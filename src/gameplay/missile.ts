import type { Asteroid } from './asteroid';

export class Missile extends Phaser.GameObjects.Sprite {
  public body: Phaser.Physics.Arcade.Body;
  private targetAsteroid: Asteroid;
  private speed: number = 800; // pixels per second
  private initialRotation: number; // Initial rotation from ship
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetAsteroid: Asteroid,
    initialRotation: number
  ) {
    super(scene, x, y, 'missile');
    
    this.targetAsteroid = targetAsteroid;
    this.initialRotation = initialRotation;
    
    // Add to scene
    scene.add.existing(this);
    
    // Enable physics
    scene.physics.world.enable(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;
    
    // Missile sprite is roughly 32x16 pixels, so use appropriate collision box
    this.body.setSize(32, 16); // Match actual missile sprite size
    this.body.setOffset(-16, -8); // Center the collision box
    
    // Set depth above asteroids but below explosions
    this.setDepth(155);
    
    // Scale the missile to be 2x bigger
    this.setScale(1.0);
    
    // Set initial rotation to match ship direction
    this.setRotation(initialRotation);
    
    // Calculate direction to target
    this.calculateAndSetVelocity();
  }
  
  private calculateAndSetVelocity(): void {
    // Get current target position (center of asteroid sprite)
    const targetX = this.targetAsteroid.x;
    const targetY = this.targetAsteroid.y;
    
    // Calculate direction vector
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Normalize direction and apply speed
      const velocityX = (dx / distance) * this.speed;
      const velocityY = (dy / distance) * this.speed;
      
      this.body.setVelocity(velocityX, velocityY);
    }
  }
  
  update(): void {
    // Remove missile if it goes off screen
    if (this.x < -50 || this.x > 1330 || this.y < -50 || this.y > 770) {
      this.destroy();
    }
  }
  
  getTargetAsteroid(): Asteroid {
    return this.targetAsteroid;
  }
}
