import { BitmapTextHelper } from '../ui/bitmapText';
import { Button } from '../ui/button';
import { gameStore, eventBus, settingsStore, createModeInput, type ModeInput, visualizerManager } from '../core';
import { GAME_SETTINGS } from '../core/settings';
import type { PlayerId } from '../types/global';
import { resetTracker } from '../gesture/tracker';

export default class SelectPlayersScene extends Phaser.Scene {
  private title: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText;
  private playerPanels: [PlayerPanel, PlayerPanel];
  private startButton: Button;
  private backButton: Button;
  private modeInput: ModeInput | null = null;
  private hasSeenWandInWandMode: boolean = false;
  
  constructor() {
    super('SelectPlayers');
  }
  
  create(): void {
    const inputMode = settingsStore.getInputMode();
    
    // Reset gesture tracker to ensure clean state for new game
    // This fixes the issue where wand detection fails after game restart
    // because the previous game's gesture data was still in the tracker
    resetTracker();
    
    // Initialize visualizer manager if in wand mode
    if (inputMode === 'wand') {
      if (!visualizerManager.isInitialized()) {
        visualizerManager.initialize(this);
      } else if (visualizerManager.needsReinitialization()) {
        visualizerManager.initialize(this);
      } else {
        visualizerManager.updateSceneReference(this);
      }
    }
    
    // Create modeInput adapter
    this.modeInput = createModeInput(inputMode, this);
    
    this.createBackground();
    this.createTitle();
    this.createPlayerPanels(inputMode);
    this.createStartButton();
    this.createBackButton();
    this.setupInput();
    this.setupEventListeners();
    
    // Reset game store for new game
    gameStore.resetForNewGame();
  }
  
  private createBackground(): void {
    // Add blurred background
    const background = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'background-blurred'
    );
    background.setDisplaySize(GAME_SETTINGS.CANVAS_WIDTH, GAME_SETTINGS.CANVAS_HEIGHT);
    background.setDepth(0);
  }
  
  private createTitle(): void {
    this.title = BitmapTextHelper.createTitleText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      100,
      'READY PLAYERS!',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.title.setDepth(100);
  }
  
  private createPlayerPanels(inputMode: 'keyboard' | 'wand'): void {
    const playerCount = settingsStore.getPlayerCount();
    const centerY = GAME_SETTINGS.CANVAS_HEIGHT / 2;
    
    if (playerCount === 1) {
      // Singleplayer mode: only show one player panel in the center
      const centerX = GAME_SETTINGS.CANVAS_WIDTH / 2;
      this.playerPanels = [
        new PlayerPanel(this, centerX, centerY, 0, inputMode),
        new PlayerPanel(this, centerX, centerY, 1, inputMode) // Hidden
      ];
      
      // Hide the second player panel for singleplayer
      this.playerPanels[1].setVisible(false);
    } else {
      // Multiplayer mode: show both player panels side-by-side
      const leftX = GAME_SETTINGS.CANVAS_WIDTH * 0.25;
      const rightX = GAME_SETTINGS.CANVAS_WIDTH * 0.75;
      
      this.playerPanels = [
        new PlayerPanel(this, leftX, centerY, 0, inputMode),
        new PlayerPanel(this, rightX, centerY, 1, inputMode)
      ];
      
      // Both panels visible in multiplayer
      this.playerPanels[0].setVisible(true);
      this.playerPanels[1].setVisible(true);
    }
  }
  
  private createStartButton(): void {
    this.startButton = new Button(this, {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2,
      y: GAME_SETTINGS.CANVAS_HEIGHT - 150,
      text: 'START',
      width: 300,
      height: 80,
      fontSize: 32,
      enabled: false,
      onClick: () => this.startGame()
    });
    this.add.existing(this.startButton);
    this.startButton.setDepth(100);
  }
  
  private createBackButton(): void {
    this.backButton = new Button(this, {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2,
      y: GAME_SETTINGS.CANVAS_HEIGHT - 80,
      text: 'BACK',
      width: 280,
      height: 50,
      fontSize: 20,
      color: 0x2A2A2A,
      style: 'gray',
      enabled: true,
      onClick: () => this.goBack()
    });
    this.add.existing(this.backButton);
    this.backButton.setDepth(100);
  }
  
  private goBack(): void {
    this.scene.start('Menu');
  }
  
  update(_time: number, _delta: number): void {
    // Handle wand mode detection
    if (settingsStore.getInputMode() === 'wand' && this.modeInput) {
      const playerCount = settingsStore.getPlayerCount();
      
      // Update visualizer manager
      visualizerManager.update();
      
      if (playerCount === 1) {
        // Singleplayer: check for player 1 wand presence (requires calibration)
        const player1WandPresent = visualizerManager.isPlayer1WandPresent();
        
        // Once wand is seen, mark as ready permanently
        if (player1WandPresent && !this.hasSeenWandInWandMode) {
          this.hasSeenWandInWandMode = true;
          eventBus.emit('player:ready', { playerId: 0, ready: 'ready' });
        }
      } else {
        // Multiplayer: check for both wands based on calibration
        // Check for player 1 wand (orange)
        const player1WandPresent = visualizerManager.isPlayer1WandPresent();
        if (player1WandPresent && gameStore.players[0].ready === 'not-ready') {
          eventBus.emit('player:ready', { playerId: 0, ready: 'ready' });
        }
        
        // Check for player 2 wand (purple)
        const player2WandPresent = visualizerManager.isPlayer2WandPresent();
        if (player2WandPresent && gameStore.players[1].ready === 'not-ready') {
          eventBus.emit('player:ready', { playerId: 1, ready: 'ready' });
        }
      }
    }
  }

  private setupInput(): void {
    const inputMode = settingsStore.getInputMode();
    const playerCount = settingsStore.getPlayerCount();
    const keys = this.input.keyboard!;
    
    if (inputMode === 'keyboard') {
      // W key toggles ready state for player 0 in keyboard mode
      keys.on('keydown-W', () => {
        const currentState = gameStore.players[0].ready;
        const newState = currentState === 'ready' ? 'not-ready' : 'ready';
        eventBus.emit('player:ready', { playerId: 0, ready: newState });
      });
      
      // I key toggles ready state for player 1 in keyboard mode (only in 2P mode)
      if (playerCount === 2) {
        keys.on('keydown-I', () => {
          const currentState = gameStore.players[1].ready;
          const newState = currentState === 'ready' ? 'not-ready' : 'ready';
          eventBus.emit('player:ready', { playerId: 1, ready: newState });
        });
      }
    }
    // In wand mode, no keys needed - wand detection is automatic
    
    // Enter key starts the game (only if required players are ready) - works in both modes
    keys.on('keydown-ENTER', () => {
      if (this.canStartGame()) {
        this.startGame();
      }
    });
  }
  
  private setupEventListeners(): void {
    eventBus.on('player:ready', (data: { playerId: PlayerId; ready: 'ready' | 'not-ready' }) => {
      this.playerPanels[data.playerId].setReady(data.ready);
      this.updateStartButton();
    });
  }
  
  private canStartGame(): boolean {
    const playerCount = settingsStore.getPlayerCount();
    
    if (playerCount === 1) {
      // Singleplayer mode: only need player 0 to be ready
      return gameStore.players[0].ready === 'ready';
    } else {
      // Multiplayer mode: need both players ready
      return gameStore.players[0].ready === 'ready' && gameStore.players[1].ready === 'ready';
    }
  }

  private updateStartButton(): void {
    this.startButton.setEnabled(this.canStartGame());
  }
  
  private startGame(): void {
    if (this.canStartGame()) {
      this.scene.start('PlayingGame');
    }
  }


}

class PlayerPanel extends Phaser.GameObjects.Container {
  private glyph: Phaser.GameObjects.Image;
  private statusText: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText;
  private playerId: PlayerId;
  private inputMode: 'keyboard' | 'wand';
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: PlayerId,
    inputMode: 'keyboard' | 'wand'
  ) {
    super(scene, x, y);
    
    this.playerId = playerId;
    this.inputMode = inputMode;
    
    // Create player ship
    const shipKey = playerId === 0 ? 'orange-ship' : 'purple-ship';
    this.glyph = scene.add.image(0, -50, shipKey);
    this.glyph.setScale(0.8);
    this.add(this.glyph);
    
    // Create status text based on input mode and player
    let statusText: string;
    if (inputMode === 'keyboard') {
      statusText = playerId === 0 ? 'PRESS W FOR READY' : 'PRESS I FOR READY';
    } else {
      statusText = 'DISPLAY WAND';
    }
    
    this.statusText = BitmapTextHelper.createHUDText(
      scene,
      0,
      50,
      statusText,
      0xFF9696 
    );
    this.add(this.statusText);
    
    scene.add.existing(this);
    this.setDepth(50);
  }
  
  setReady(ready: 'ready' | 'not-ready'): void {
    // Remove the old text
    this.statusText.destroy();
    
    // Create new text with proper color
    if (ready === 'ready') {
      this.statusText = BitmapTextHelper.createHUDText(
        this.scene,
        0,
        50,
        'READY',
        0x96FFA2
      );
    } else {
      let statusText: string;
      if (this.inputMode === 'keyboard') {
        statusText = this.playerId === 0 ? 'PRESS W FOR READY' : 'PRESS I FOR READY';
      } else {
        statusText = 'DISPLAY WAND';
      }
      
      this.statusText = BitmapTextHelper.createHUDText(
        this.scene,
        0,
        50,
        statusText,
        0xFF9696 
      );
    }
    
    // Add the new text to the container
    this.add(this.statusText);
    
    // Update game store
    gameStore.setPlayerReady(this.playerId, ready);
  }
}
