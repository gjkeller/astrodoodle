import { Visualizer } from '../ui/visualizer';
import { BitmapTextHelper } from '../ui/bitmapText';
import { GAME_SETTINGS } from '../core/settings';
import { visualizerManager } from '../core';

export default class WandCalibrationScene extends Phaser.Scene {
  private visualizer1: Visualizer; // Player 1 (orange) visualizer
  private visualizer2: Visualizer; // Player 2 (purple) visualizer
  private backButton: Phaser.GameObjects.Container;
  private player1Button: Phaser.GameObjects.Container;
  private player2Button: Phaser.GameObjects.Container;
  private selectedPlayer: 1 | 2 = 1;
  private player1Calibrated: boolean = false;
  private player2Calibrated: boolean = false;
  
  constructor() {
    super('WandCalibration');
  }
  
  create(): void {
    console.log('WandCalibrationScene: Creating scene');
    // Only initialize if not already initialized or if the previous scene was destroyed
    if (!visualizerManager.isInitialized()) {
      console.log('WandCalibrationScene: Initializing visualizer manager');
      visualizerManager.initialize(this);
    } else if (visualizerManager.needsReinitialization()) {
      console.log('WandCalibrationScene: Reinitializing visualizer manager (scene destroyed)');
      visualizerManager.initialize(this);
    } else {
      console.log('WandCalibrationScene: Visualizer manager already initialized and working');
      // Just update the scene reference without reinitializing
      visualizerManager.updateSceneReference(this);
    }
    
    // Dark background
    this.add.rectangle(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      GAME_SETTINGS.CANVAS_WIDTH,
      GAME_SETTINGS.CANVAS_HEIGHT,
      0x000000
    );
    
    // Title
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      80,
      'WAND CALIBRATION',
      { fontFamily: '"Press Start 2P"', fontSize: '32px', color: '#edeeff' }
    ).setOrigin(0.5);
    
    // Instructions
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      140,
      'Select player and move wand to calibrate',
      { fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#aaaaaa' }
    ).setOrigin(0.5);
    
    // Player selection buttons
    this.createPlayerSelectionButtons();
    
    // Dual visualizers side by side
    this.visualizer1 = new Visualizer(
      this,
      GAME_SETTINGS.CANVAS_WIDTH * 0.25, // Left side
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      0.8, // Slightly smaller to fit both
      GAME_SETTINGS.COLORS.ORANGE, // Orange for Player 1
      3,
      0x222222
    );
    
    this.visualizer2 = new Visualizer(
      this,
      GAME_SETTINGS.CANVAS_WIDTH * 0.75, // Right side
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      0.8, // Slightly smaller to fit both
      GAME_SETTINGS.COLORS.PURPLE, // Purple for Player 2
      3,
      0x222222
    );
    
    // Add labels for each visualizer
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH * 0.25,
      GAME_SETTINGS.CANVAS_HEIGHT / 2 - 200,
      'PLAYER 1',
      { fontFamily: '"Press Start 2P"', fontSize: '20px', color: GAME_SETTINGS.COLORS.ORANGE }
    ).setOrigin(0.5);
    
    this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH * 0.75,
      GAME_SETTINGS.CANVAS_HEIGHT / 2 - 200,
      'PLAYER 2',
      { fontFamily: '"Press Start 2P"', fontSize: '20px', color: GAME_SETTINGS.COLORS.PURPLE }
    ).setOrigin(0.5);
    
    // Back button
    this.createBackButton();
  }
  
  update(): void {
    // Update visualizer manager
    visualizerManager.update();
    
    // Get data from singleton manager for both players
    const player1Points = visualizerManager.getPlayer1Points();
    const player1Position = visualizerManager.getPlayer1CurrentPosition();
    const player1Spell = visualizerManager.getVisualizerSpell();
    
    const player2Points = visualizerManager.getPlayer2Points();
    const player2Position = visualizerManager.getPlayer2CurrentPosition();
    const player2Spell = visualizerManager.getWand2VisualizerSpell();
    
    // Check if wand is present and mark current selected player as calibrated
    const wandPresent = visualizerManager.isWandPresent();
    if (wandPresent && !this.isCurrentPlayerCalibrated()) {
      this.markCurrentPlayerCalibrated();
    }
    
    // Update visualizer 1 (Player 1 - Orange)
    this.visualizer1.setPoints(player1Points);
    this.visualizer1.setCurrentPosition(player1Position);
    this.visualizer1.showSpell(player1Spell);
    
    // Update visualizer 2 (Player 2 - Purple)
    this.visualizer2.setPoints(player2Points);
    this.visualizer2.setCurrentPosition(player2Position);
    this.visualizer2.showSpell(player2Spell);
  }

  /**
   * Convert HSV values to RGB hex color (copied from VisualizerTestScene)
   */
  private hsvToRgbHex(h: number, s: number, v: number): number {
    // Normalize OpenCV HSV values to 0-1 range
    const hNorm = h / 179;
    const sNorm = s / 255;
    const vNorm = v / 255;

    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1));
    const m = vNorm - c;

    let r = 0, g = 0, b = 0;

    if (hNorm < 1/6) {
      r = c; g = x; b = 0;
    } else if (hNorm < 2/6) {
      r = x; g = c; b = 0;
    } else if (hNorm < 3/6) {
      r = 0; g = c; b = x;
    } else if (hNorm < 4/6) {
      r = 0; g = x; b = c;
    } else if (hNorm < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (r << 16) | (g << 8) | b;
  }
  
  private createPlayerSelectionButtons(): void {
    const buttonWidth = 120;
    const spacing = 20;
    
    // Player 1 button (left side)
    this.player1Button = this.add.container(
      GAME_SETTINGS.CANVAS_WIDTH / 2 - buttonWidth / 2 - spacing / 2,
      200
    );
    
    // Player 2 button (right side)
    this.player2Button = this.add.container(
      GAME_SETTINGS.CANVAS_WIDTH / 2 + buttonWidth / 2 + spacing / 2,
      200
    );
    
    this.createPlayerButton(this.player1Button, 1, 'PLAYER 1', GAME_SETTINGS.COLORS.ORANGE);
    this.createPlayerButton(this.player2Button, 2, 'PLAYER 2', GAME_SETTINGS.COLORS.PURPLE);
    
    // Update button states
    this.updatePlayerButtonStates();
  }
  
  private createPlayerButton(container: Phaser.GameObjects.Container, playerId: 1 | 2, text: string, color: number): void {
    const buttonWidth = 120;
    const buttonHeight = 40;
    
    // Create button background
    const bg = this.add.graphics();
    bg.fillStyle(0x333333, 0.8);
    bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    
    // Create button text
    const buttonText = BitmapTextHelper.createButtonText(this, 0, 0, text);
    buttonText.setTint(color);
    
    container.add([bg, buttonText]);
    container.setSize(buttonWidth, buttonHeight);
    container.setDepth(5);
    
    // Make button interactive
    container.setInteractive();
    
    // Add hover effects
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x444444, 0.9);
      bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    });
    
    container.on('pointerout', () => {
      this.updatePlayerButtonStates();
    });
    
    container.on('pointerdown', () => {
      this.selectPlayer(playerId);
    });
  }
  
  private selectPlayer(playerId: 1 | 2): void {
    this.selectedPlayer = playerId;
    visualizerManager.setCalibrationPlayer(playerId);
    this.updatePlayerButtonStates();
  }
  
  private updatePlayerButtonStates(): void {
    const buttonWidth = 120;
    const buttonHeight = 40;
    
    // Update Player 1 button
    const bg1 = this.player1Button.list[0] as Phaser.GameObjects.Graphics;
    bg1.clear();
    if (this.selectedPlayer === 1) {
      bg1.fillStyle(0x555555, 0.9);
      bg1.lineStyle(3, GAME_SETTINGS.COLORS.ORANGE, 1);
    } else {
      bg1.fillStyle(0x333333, 0.8);
      bg1.lineStyle(2, GAME_SETTINGS.COLORS.ORANGE, 1);
    }
    bg1.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    bg1.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    
    // Update Player 2 button
    const bg2 = this.player2Button.list[0] as Phaser.GameObjects.Graphics;
    bg2.clear();
    if (this.selectedPlayer === 2) {
      bg2.fillStyle(0x555555, 0.9);
      bg2.lineStyle(3, GAME_SETTINGS.COLORS.PURPLE, 1);
    } else {
      bg2.fillStyle(0x333333, 0.8);
      bg2.lineStyle(2, GAME_SETTINGS.COLORS.PURPLE, 1);
    }
    bg2.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
    bg2.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 8);
  }
  
  private isCurrentPlayerCalibrated(): boolean {
    return this.selectedPlayer === 1 ? this.player1Calibrated : this.player2Calibrated;
  }
  
  private markCurrentPlayerCalibrated(): void {
    if (this.selectedPlayer === 1) {
      this.player1Calibrated = true;
    } else {
      this.player2Calibrated = true;
    }
    
    // Set the calibration player and mark as calibrated
    visualizerManager.setCalibrationPlayer(this.selectedPlayer);
    visualizerManager.markPlayerCalibrated();
    
    // Debug logging
    const debugInfo = visualizerManager.getDebugInfo();
    console.log(`Player ${this.selectedPlayer} wand calibrated!`);
    console.log('Debug info:', debugInfo);
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
    
    // Make button interactive
    this.backButton.setInteractive();
    
    // Add hover effects
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
      this.goBack();
    });
  }

  private goBack(): void {
    this.scene.start('Settings');
  }
}
