import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';
import { VisionTuner } from '../tracking';

export default class VisualizerTestScene extends Phaser.Scene {
  private backButton: Phaser.GameObjects.Container;
  private vision: VisionTuner;

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
    // Create a placeholder content area for testing
    const contentY = 200;
    
    // Add some test text
    const testText = BitmapTextHelper.createButtonText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      contentY,
      'Visualizer Test Scene\nThis is a placeholder for\nvisualization testing features.'
    );
    testText.setDepth(5);
    testText.setOrigin(0.5, 0.5);
    
    // Create a test rectangle for visualization
    const testRect = this.add.graphics();
    testRect.fillStyle(0x00ff00, 0.5);
    testRect.fillRect(
      GAME_SETTINGS.CANVAS_WIDTH / 2 - 100,
      contentY + 100,
      200,
      100
    );
    testRect.lineStyle(2, 0x00ff00, 1);
    testRect.strokeRect(
      GAME_SETTINGS.CANVAS_WIDTH / 2 - 100,
      contentY + 100,
      200,
      100
    );
    testRect.setDepth(5);
    
    // Add animated elements for testing
    this.createTestAnimation();
  }

  private createTestAnimation(): void {
    // Create a simple animated circle for testing
    const circle = this.add.graphics();
    circle.fillStyle(0xff6600, 0.8);
    circle.fillCircle(0, 0, 20);
    circle.x = GAME_SETTINGS.CANVAS_WIDTH / 2;
    circle.y = GAME_SETTINGS.CANVAS_HEIGHT / 2;
    circle.setDepth(6);
    
    // Simple rotation animation
    this.tweens.add({
      targets: circle,
      rotation: Math.PI * 2,
      duration: 2000,
      repeat: -1,
      ease: 'Linear'
    });
    
    // Simple scale pulse animation
    this.tweens.add({
      targets: circle,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

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