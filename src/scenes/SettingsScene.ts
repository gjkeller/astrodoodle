import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS, settingsStore, visualizerManager } from '../core';

interface SettingsButton {
  label: string;
  callback?: () => void;
}

export default class SettingsScene extends Phaser.Scene {
  private backButton: Phaser.GameObjects.Container;
  private settingsButtons: Phaser.GameObjects.Container[] = [];
  private buttonConfigs: SettingsButton[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private inputModeButton: Phaser.GameObjects.Container | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private playerCountButton: Phaser.GameObjects.Container | null = null;
  private calibrateWandButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Settings');
  }

  create(): void {
    // Initialize default button configurations
    this.initializeButtonConfigs();
    
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

  private initializeButtonConfigs(): void {
    this.buttonConfigs = [
      { 
        label: 'Ball Tracker',
        callback: () => {
          this.scene.start('BallTracker');
        }
      },
      { 
        label: 'Visualizer',
        callback: () => {
          this.scene.start('VisualizerTest');
        }
      }
    ];
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

    // Create existing buttons (BALL TRACKER, VISUALIZER TEST)
    this.buttonConfigs.forEach((config, index) => {
      const button = this.createSettingsButton(
        GAME_SETTINGS.CANVAS_WIDTH / 2,
        startY + (index * buttonSpacing),
        buttonWidth,
        buttonHeight,
        config,
        index
      );
      this.settingsButtons.push(button);
    });

    // Create Input Mode button
    this.inputModeButton = this.createInputModeButton(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      startY + (this.buttonConfigs.length * buttonSpacing),
      buttonWidth,
      buttonHeight
    );

    // Create Player Count button (disabled)
    this.playerCountButton = this.createPlayerCountButton(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      startY + ((this.buttonConfigs.length + 1) * buttonSpacing),
      buttonWidth,
      buttonHeight
    );

    // Create Calibrate Wand button
    this.calibrateWandButton = this.createCalibrateWandButton(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      startY + ((this.buttonConfigs.length + 2) * buttonSpacing),
      buttonWidth,
      buttonHeight
    );
  }

  private createSettingsButton(x: number, y: number, width: number, height: number, config: SettingsButton, buttonIndex: number): Phaser.GameObjects.Container {
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
      config.label
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
      this.executeButtonCallback(buttonIndex);
    });
    
    return button;
  }

  private createInputModeButton(x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
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
      this.getInputModeLabel()
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
      this.toggleInputMode();
      // Update button text
      text.setText(this.getInputModeLabel());
    });
    
    return button;
  }

  private createPlayerCountButton(x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    
    // Create disabled button background
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.8);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, 0x444444, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    
    // Create button text
    const text = BitmapTextHelper.createButtonText(
      this,
      0,
      0,
      '1 Player'
    );
    text.setTint(0x888888); // Gray out the text
    
    button.add([bg, text]);
    button.setSize(width, height);
    button.setDepth(5);
    
    // No hover effects for disabled button
    
    return button;
  }

  private createCalibrateWandButton(x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    const isWandMode = settingsStore.getInputMode() === 'wand';
    
    // Create button background
    const bg = this.add.graphics();
    bg.fillStyle(isWandMode ? 0x4a4a4a : 0x222222, 0.8);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.lineStyle(2, isWandMode ? 0x888888 : 0x444444, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    
    // Create button text
    const text = BitmapTextHelper.createButtonText(
      this,
      0,
      0,
      'Calibrate Wand'
    );
    text.setTint(isWandMode ? 0xFFFFFF : 0x666666);
    
    button.add([bg, text]);
    button.setSize(width, height);
    button.setDepth(5);
    
    if (isWandMode) {
      button.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
      
      button.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x5a5a5a, 0.8);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(2, 0x999999, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      });
      
      button.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x4a4a4a, 0.8);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.lineStyle(2, 0x888888, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
      });
      
    button.on('pointerdown', () => {
      // Initialize visualizer manager if not already done
      if (!visualizerManager.isInitialized()) {
        visualizerManager.initialize(this);
      }
      this.scene.start('WandCalibration');
    });
    }
    
    return button;
  }

  private getInputModeLabel(): string {
    return settingsStore.getInputMode() === 'keyboard' ? 'Keyboard Mode' : 'Wand Mode';
  }

  private toggleInputMode(): void {
    const currentMode = settingsStore.getInputMode();
    const newMode = currentMode === 'keyboard' ? 'wand' : 'keyboard';
    settingsStore.setInputMode(newMode);
    
    // Update button text
    if (this.inputModeButton) {
      const text = this.inputModeButton.getAt(1) as Phaser.GameObjects.BitmapText;
      text.setText(this.getInputModeLabel());
    }
    
    // Refresh calibrate button state
    if (this.calibrateWandButton) {
      this.calibrateWandButton.destroy();
    }
    const buttonWidth = 300;
    const buttonHeight = 60;
    const buttonSpacing = 80;
    const startY = 200;
    this.calibrateWandButton = this.createCalibrateWandButton(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      startY + ((this.buttonConfigs.length + 2) * buttonSpacing),
      buttonWidth,
      buttonHeight
    );
    
    // Auto-launch calibration when switching to wand mode
    if (newMode === 'wand') {
      console.log('SettingsScene: Switching to wand mode');
      // Initialize visualizer manager if not already done
      if (!visualizerManager.isInitialized()) {
        visualizerManager.initialize(this);
      }
      // Wait a frame for initialization
      this.time.delayedCall(100, () => {
        this.scene.start('WandCalibration');
      });
    } else {
      // When switching to keyboard mode, cleanup visualizer manager
      console.log('SettingsScene: Switching to keyboard mode');
      visualizerManager.cleanup();
    }
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
      'Back'
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

  /**
   * Execute callback for a button by index
   * @param buttonIndex - The button index (0-4)
   */
  private executeButtonCallback(buttonIndex: number): void {
    const config = this.buttonConfigs[buttonIndex];
    if (config?.callback) {
      config.callback();
    } else {
      console.log(`No callback configured for button ${buttonIndex + 1}`);
    }
  }

  /**
   * Set a callback function for a specific button
   * @param buttonIndex - The button index (0-4)
   * @param callback - The function to execute when the button is clicked
   */
  public setButtonCallback(buttonIndex: number, callback: () => void): void {
    if (buttonIndex >= 0 && buttonIndex < this.buttonConfigs.length) {
      this.buttonConfigs[buttonIndex].callback = callback;
      console.log(`Callback configured for button ${buttonIndex + 1}`);
    } else {
      console.warn(`Invalid button index: ${buttonIndex}. Must be 0-${this.buttonConfigs.length - 1}.`);
    }
  }

  /**
   * Remove a callback for a specific button
   * @param buttonIndex - The button index (0-4)
   */
  public removeButtonCallback(buttonIndex: number): void {
    if (buttonIndex >= 0 && buttonIndex < this.buttonConfigs.length) {
      delete this.buttonConfigs[buttonIndex].callback;
      console.log(`Callback removed for button ${buttonIndex + 1}`);
    } else {
      console.warn(`Invalid button index: ${buttonIndex}. Must be 0-${this.buttonConfigs.length - 1}.`);
    }
  }

  /**
   * Get all button configurations
   * @returns Array containing all button configurations
   */
  public getButtonConfigs(): SettingsButton[] {
    return [...this.buttonConfigs];
  }

  /**
   * Set all button configurations at once
   * @param configs - Array of button configurations
   */
  public setButtonConfigs(configs: SettingsButton[]): void {
    this.buttonConfigs = [...configs];
    console.log(`Button configurations updated with ${configs.length} buttons`);
  }
}
