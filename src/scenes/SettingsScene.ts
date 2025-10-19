import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';

export default class SettingsScene extends Phaser.Scene {
  private backButton: Phaser.GameObjects.Container;
  private settingsButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Settings');
  }

  create(): void {
    // Create background
    this.createBackground();
    
    // Create title
    this.createTitle();
    
    // Create settings buttons
    this.createSettingsButtons();
    
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
      'SETTINGS'
    );
    title.setDepth(10);
  }

  private createSettingsButtons(): void {
    const buttonWidth = 300;
    const buttonHeight = 60;
    const buttonSpacing = 80;
    const startY = 200;
    
    const buttonLabels = [
      'BUTTON 1',
      'BUTTON 2', 
      'BUTTON 3',
      'BUTTON 4',
      'BUTTON 5'
    ];

    for (let i = 0; i < 5; i++) {
      const button = this.createSettingsButton(
        GAME_SETTINGS.CANVAS_WIDTH / 2,
        startY + (i * buttonSpacing),
        buttonWidth,
        buttonHeight,
        buttonLabels[i]
      );
      this.settingsButtons.push(button);
    }
  }

  private createSettingsButton(x: number, y: number, width: number, height: number, label: string): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Create button background
    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 0.8);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x666666, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    
    // Create button text
    const text = BitmapTextHelper.createButtonText(
      this,
      0,
      0,
      label
    );
    
    button.add([bg, text]);
    button.setSize(width, height);
    button.setDepth(5);
    
    // Add hover effects
    button.setInteractive();
    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444444, 0.9);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.lineStyle(2, 0x888888, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    });
    
    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x333333, 0.8);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.lineStyle(2, 0x666666, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    });
    
    button.on('pointerdown', () => {
      // Placeholder - button functionality will be added later
      console.log(`Settings button clicked: ${label}`);
    });
    
    return button;
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
      this.scene.start('Menu');
    });
  }

  private setupInput(): void {
    const keys = this.input.keyboard!;
    
    // ESC key to go back
    keys.on('keydown-ESC', () => {
      this.scene.start('Menu');
    });
  }
}
