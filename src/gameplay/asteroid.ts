import type { PlayerSide, PlayerId } from '../types/global';

export class Asteroid extends Phaser.GameObjects.Container {
  public sprite: Phaser.GameObjects.Image;
  private characterTexts: Phaser.GameObjects.Text[] = [];
  private side: PlayerSide;
  private playerId: PlayerId;
  private sequence: string;
  public currentIndex: number = 0;
  private consumedKeys: boolean[] = [];
  private sequenceLength: number;
  public body: Phaser.Physics.Arcade.Body;
  private missileHits: number = 0; // Track how many missiles have hit this asteroid
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: PlayerSide,
    sequence: string,
    playerId: PlayerId
  ) {
    super(scene, x, y);
    
    this.side = side;
    this.playerId = playerId;
    this.sequence = sequence;
    this.sequenceLength = sequence.split(' ').length;
    this.consumedKeys = new Array(this.sequenceLength).fill(false);
    
    // Calculate scale based on sequence length (1=0.5, 4=1.2)
    const scale = this.calculateScale(this.sequenceLength);
    
    // Create asteroid sprite using meteor1.png asset
    this.sprite = scene.add.image(0, 0, 'meteor1');
    this.sprite.setScale(scale);
    
    // Add random rotation (0 to 360 degrees)
    const randomRotation = Math.random() * Math.PI * 2; // 0 to 2π radians
    this.sprite.setRotation(randomRotation);
    
    this.add(this.sprite);
    
    // Create individual character texts above the asteroid
    this.createCharacterTexts(sequence, scale);
    
    scene.add.existing(this);
    this.setDepth(150); // Ensure asteroids are visible above background
    
    // Enable physics body for smooth movement on the container
    this.scene.physics.world.enable(this);
    this.body = this.body as Phaser.Physics.Arcade.Body;

    // Use circular body that scales with the asteroid
    // Base radius is 40 pixels, scaled by asteroid scale
    const radius = 40 * scale;
    this.body.setCircle(radius, 0, 0); // setCircle(radius, offsetX, offsetY) - centered
    
    // Debug logging
    console.log(`Created asteroid at (${x}, ${y}) with sequence: ${sequence}, length: ${this.sequenceLength}, scale: ${scale}, rotation: ${randomRotation.toFixed(2)}`);
  }
  
  canAcceptKey(key: string): boolean {
    if (this.currentIndex >= this.sequenceLength) {
      return false; // Sequence already completed
    }
    
    const expectedKey = this.sequence.split(' ')[this.currentIndex];
    return key === expectedKey;
  }
  
  processKeyPress(key: string): boolean {
    if (!this.canAcceptKey(key)) {
      return false;
    }
    
    // Mark this key as consumed
    this.consumedKeys[this.currentIndex] = true;
    this.currentIndex++;
    
    // Update the display to show consumed keys as grayed out
    this.updateDisplay();
    
    // Return true for successful keypress
    return true;
  }
  
  private calculateScale(sequenceLength: number): number {
    // Adjusted scaling to make 1 and 2-shape asteroids bigger
    // 1 shape = 0.7 scale, 2 shapes = 0.9 scale, 3 shapes = 1.1 scale
    switch (sequenceLength) {
      case 1: return 0.7;  // Bigger than before (was 0.5)
      case 2: return 0.9;  // Bigger than before (was 0.73)
      case 3: return 1.1;  // Slightly bigger than before (was 0.97)
      default: return 1.0; // Fallback
    }
  }

  private createCharacterTexts(sequence: string, scale: number): void {
    const keys = sequence.split(' ');
    const totalWidth = (keys.length - 1) * 30; // Space between characters
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      
      // Check if this is a spell (wand mode) or a regular key (keyboard mode)
      if (this.isSpellKey(key)) {
        // Create glyph sprite for spell
        const glyphKey = this.getGlyphAssetKey(key);
        if (glyphKey) {
          const glyphSprite = this.scene.add.image(
            startX + (i * 30),
            -70,
            glyphKey
          );
          glyphSprite.setScale(scale * 0.8); // Scale with asteroid
          glyphSprite.setOrigin(0.5);
          glyphSprite.setDepth(151);
          glyphSprite.setAlpha(0.9); // Slightly transparent like visualizer
          // Don't apply tint to preserve original glyph colors
          this.characterTexts.push(glyphSprite as any); // Store as any to maintain compatibility
          this.add(glyphSprite);
        }
      } else {
        // Create text for keyboard keys
        const fontSize = Math.round(24 * scale);
        const charText = this.scene.add.text(
          startX + (i * 30),
          -70,
          key,
          {
            fontSize: `${fontSize}px`,
            fontFamily: '"Press Start 2P", monospace',
            color: '#ffff00',
            align: 'center'
          }
        );
        charText.setOrigin(0.5);
        charText.setDepth(151);
        this.characterTexts.push(charText);
        this.add(charText);
      }
    }
  }
  
  private isSpellKey(key: string): boolean {
    return ['NULL', 'STAR', 'TRIANGLE', 'ARROW'].includes(key);
  }
  
  private getGlyphAssetKey(spell: string): string | null {
    const glyphMapping: Record<string, string> = {
      'NULL': 'glyph-null',
      'STAR': 'glyph-star',
      'TRIANGLE': 'glyph-triangle',
      'ARROW': 'glyph-arrow'
    };
    return glyphMapping[spell] || null;
  }
  
  // Update text positions to follow physics body
  updateTextPositions(): void {
    // Text is already part of the container, so it moves with the container automatically
    // No additional positioning needed since physics body is on the container
  }
  
  private updateDisplay(): void {
    // Update each character text/sprite color
    for (let i = 0; i < this.characterTexts.length; i++) {
      const element = this.characterTexts[i];
      
      if (this.consumedKeys[i]) {
        // Gray out consumed keys
        if (element.setTint) {
          // Text elements have setTint
          element.setTint(0x666666);
        } else {
          // Glyph sprites - use alpha to gray out
          element.setAlpha(0.4);
        }
      } else {
        // Keep active keys bright
        if (element.setTint) {
          // Text elements - keep yellow
          element.setTint(0xffff00);
        } else {
          // Glyph sprites - keep original colors with full alpha
          element.setAlpha(0.9);
        }
      }
    }
  }
  
  getSequenceLength(): number {
    return this.sequenceLength;
  }
  
  getSide(): PlayerSide {
    return this.side;
  }
  
  getPlayerId(): PlayerId {
    return this.playerId;
  }
  
  isComplete(): boolean {
    return this.currentIndex >= this.sequenceLength;
  }
  
  // Physics body methods for smooth movement
  setVelocity(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
  }
  
  getPhysicsX(): number {
    return this.body.x;
  }
  
  getPhysicsY(): number {
    return this.body.y;
  }
  
  getPhysicsBody(): Phaser.Physics.Arcade.Body {
    return this.body;
  }
  
  // Create explosion animation when asteroid is destroyed
  createExplosion(): void {
    // Get the asteroid's position and scale
    const x = this.getPhysicsX();
    const y = this.getPhysicsY();
    const scale = this.sprite.scaleX;
    
    // Create explosion sprite
    const explosion = this.scene.add.sprite(x, y, 'explosion');
    
    // Scale explosion to be larger than the asteroid for better visual effect
    // Base explosion size is 64x64, so scale it appropriately
    const explosionScale = scale; // Make explosion 2x larger than asteroid
    
    // Set the scale using setDisplaySize to avoid clipping issues
    explosion.setDisplaySize(96 * explosionScale, 96 * explosionScale);
    
    // Set depth to be above asteroids but below UI
    explosion.setDepth(160);
    
    // Play animation and destroy when complete
    explosion.play('explosion');
    explosion.on('animationcomplete', () => {
      explosion.destroy();
    });
  }
  
  // Handle missile impact - returns true if asteroid should be destroyed
  handleMissileImpact(missileX: number, missileY: number): boolean {
    this.missileHits++;
    
    // Check if this is the final missile (sequence complete)
    if (this.missileHits >= this.sequenceLength) {
      // Final missile - create LARGE explosion and destroy asteroid
      this.createExplosion(); // This creates the large explosion
      this.scene.time.delayedCall(50, () => {
        this.destroy();
      });
      return true; // Asteroid will be destroyed
    } else {
      // Not final missile - create SMALL explosion at impact point
      this.createSmallExplosion(missileX, missileY);
      return false; // Asteroid continues to exist
    }
  }

  // Create a small explosion at a specific location
  private createSmallExplosion(x: number, y: number): void {
    const explosion = this.scene.add.sprite(x, y, 'explosion');
    explosion.setDepth(180); // Above everything else
    
    // Make explosion very small (0.2 size)
    const explosionScale = 0.2;
    explosion.setDisplaySize(96 * explosionScale, 96 * explosionScale);
    
    // Play explosion animation
    explosion.play('explosion');
    
    // Destroy explosion sprite when animation completes
    explosion.on('animationcomplete', () => {
      explosion.destroy();
    });
  }

  // Delete method that handles explosion timing properly (legacy method)
  delete(): void {
    // Create explosion first
    this.createExplosion();
    
    // Destroy the asteroid after a short delay to let explosion start
    this.scene.time.delayedCall(50, () => {
      this.destroy();
    });
  }
}
