import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';
import { VisionTuner } from '../tracking';
import { Visualizer, Spell, Point } from '../ui/visualizer';

export default class VisualizerTestScene extends Phaser.Scene {
  private backButton: Phaser.GameObjects.Container;
  private vision: VisionTuner;
  private visualizer: Visualizer;
  private testPoints: Point[] = [];
  private currentPos: Point = { x: 320, y: 240 };
  private currentSpell: Spell = Spell.NONE;
  private spellButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('VisualizerTest');
  }

  create(): void {
    this.vision = new VisionTuner();
    // Create background
    this.createBackground();
    
    // Create title
    this.createTitle();
    
    // Create content area
    this.createContent();
    
    // Create back button
    this.createBackButton();
    
    // Setup input
    this.setupInput();
    
    // Create test points
    this.generateTestPoints();
    
    // Update visualizer
    this.updateVisualizer();
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
      0x4488FF, // border color
      3, // border width
      0x000066 // background color
    );
    
    // Create spell selection buttons
    this.createSpellButtons();
    
    // Add click listener for testing interaction
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const container = this.visualizer.getContainer();
      const bounds = container.getBounds();
      
      if (
        pointer.x >= bounds.left && 
        pointer.x <= bounds.right && 
        pointer.y >= bounds.top && 
        pointer.y <= bounds.bottom
      ) {
        // Convert click to visualizer space
        const scale = 0.4; // Same as used in visualizer
        const relX = (pointer.x - bounds.left) / scale;
        const relY = (pointer.y - bounds.top) / scale;
        
        // Update current position
        this.currentPos = { x: relX, y: relY };
        
        // Add a point to our test points
        this.testPoints.push({ x: relX, y: relY });
        if (this.testPoints.length > 20) {
          // Keep only last 20 points
          this.testPoints.shift();
        }
        
        this.updateVisualizer();
      }
    });
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
  
  private generateTestPoints(): void {
    // Create some initial test points in a circle pattern
    const centerX = 320;
    const centerY = 240;
    const radius = 100;
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      this.testPoints.push({ x, y });
    }
  }
  
  private updateVisualizer(): void {
    if (this.visualizer) {
      this.visualizer.setPoints(this.testPoints);
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
      this.scene.start('Settings');
    });
  }

  private setupInput(): void {
    const keys = this.input.keyboard!;
    
    // ESC key to go back
    keys.on('keydown-ESC', () => {
      this.scene.start('Settings');
    });
  }
}