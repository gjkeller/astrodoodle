import type { PlayerSide } from '../types/global';

export class Asteroid extends Phaser.GameObjects.Container {
  public sprite: Phaser.GameObjects.Image;
  private characterTexts: Phaser.GameObjects.Text[] = [];
  private side: PlayerSide;
  private sequence: string;
  private currentIndex: number = 0;
  private consumedKeys: boolean[] = [];
  private sequenceLength: number;
  public body: Phaser.Physics.Arcade.Body;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    side: PlayerSide,
    sequence: string
  ) {
    super(scene, x, y);
    
    this.side = side;
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
    this.body.setSize(80, 80); // Set collision box size
    this.body.setOffset(-40, -40); // Center the collision box
    
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
    
    // Return true if sequence is complete
    return this.currentIndex >= this.sequenceLength;
  }
  
  private calculateScale(sequenceLength: number): number {
    // Linear interpolation: 1 input = 0.5 scale, 4 inputs = 1.2 scale
    // Formula: scale = 0.5 + (sequenceLength - 1) * (1.2 - 0.5) / (4 - 1)
    // Simplified: scale = 0.5 + (sequenceLength - 1) * 0.7 / 3
    return 0.5 + (sequenceLength - 1) * 0.7 / 3;
  }

  private createCharacterTexts(sequence: string, scale: number): void {
    const keys = sequence.split(' ');
    const totalWidth = (keys.length - 1) * 30; // Space between characters
    const startX = -totalWidth / 2;
    
    // Calculate font size based on scale (base 24px scaled by meteor scale)
    const fontSize = Math.round(24 * scale);
    
    for (let i = 0; i < keys.length; i++) {
      const charText = this.scene.add.text(
        startX + (i * 30),
        -70,
        keys[i],
        {
          fontSize: `${fontSize}px`, // Scale font size with meteor
          fontFamily: '"Press Start 2P", monospace', // Ensure Press Start 2P
          color: '#ffff00', // Start with yellow
          align: 'center'
        }
      );
      charText.setOrigin(0.5);
      charText.setDepth(151);
      this.characterTexts.push(charText);
      this.add(charText);
    }
  }
  
  // Update text positions to follow physics body
  updateTextPositions(): void {
    // Text is already part of the container, so it moves with the container automatically
    // No additional positioning needed since physics body is on the container
  }
  
  private updateDisplay(): void {
    // Update each character text color
    for (let i = 0; i < this.characterTexts.length; i++) {
      if (this.consumedKeys[i]) {
        // Gray out consumed keys
        this.characterTexts[i].setTint(0x666666);
      } else {
        // Keep active keys yellow
        this.characterTexts[i].setTint(0xffff00);
      }
    }
  }
  
  getSequenceLength(): number {
    return this.sequenceLength;
  }
  
  getSide(): PlayerSide {
    return this.side;
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
}
