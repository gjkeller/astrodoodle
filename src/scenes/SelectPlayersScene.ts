import { BitmapTextHelper } from '../ui/bitmapText';
import { Button } from '../ui/button';
import { gameStore, eventBus } from '../core';
import { GAME_SETTINGS } from '../core/settings';
import type { PlayerId } from '../types/global';

export default class SelectPlayersScene extends Phaser.Scene {
  private title: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText;
  private playerPanels: [PlayerPanel, PlayerPanel];
  private startButton: Button;
  private backButton: Button;
  
  constructor() {
    super('SelectPlayers');
  }
  
  create(): void {
    this.createBackground();
    this.createTitle();
    this.createPlayerPanels();
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
  
  private createPlayerPanels(): void {
    const centerX = GAME_SETTINGS.CANVAS_WIDTH / 2;
    const centerY = GAME_SETTINGS.CANVAS_HEIGHT / 2;
    
    // Singleplayer mode: only show one player panel in the center
    this.playerPanels = [
      new PlayerPanel(this, centerX, centerY, 0),
      new PlayerPanel(this, centerX, centerY, 1) // Hidden
    ];
    
    // Hide the second player panel for singleplayer
    this.playerPanels[1].setVisible(false);
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
  
  private setupInput(): void {
    // Singleplayer mode: W key toggles ready state for player 0
    const keys = this.input.keyboard!;
    keys.on('keydown-W', () => {
      const currentState = gameStore.players[0].ready;
      const newState = currentState === 'ready' ? 'not-ready' : 'ready';
      eventBus.emit('player:ready', { playerId: 0, ready: newState });
    });
    
    // Enter key starts the game (only if player is ready)
    keys.on('keydown-ENTER', () => {
      if (gameStore.players[0].ready === 'ready') {
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
  
  private updateStartButton(): void {
    // Singleplayer mode: only need player 0 to be ready
    const playerReady = gameStore.players[0].ready === 'ready';
    this.startButton.setEnabled(playerReady);
  }
  
  private startGame(): void {
    // Singleplayer mode: only need player 0 to be ready
    if (gameStore.players[0].ready === 'ready') {
      this.scene.start('PlayingGame');
    }
  }
}

class PlayerPanel extends Phaser.GameObjects.Container {
  private glyph: Phaser.GameObjects.Image;
  private statusText: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText;
  private playerId: PlayerId;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: PlayerId
  ) {
    super(scene, x, y);
    
    this.playerId = playerId;
    
    // Create player ship
    const shipKey = playerId === 0 ? 'orange-ship' : 'purple-ship';
    this.glyph = scene.add.image(0, -50, shipKey);
    this.glyph.setScale(0.8);
    this.add(this.glyph);
    
    // Create status text
    this.statusText = BitmapTextHelper.createHUDText(
      scene,
      0,
      50,
      'PRESS W FOR READY',
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
      this.statusText = BitmapTextHelper.createHUDText(
        this.scene,
        0,
        50,
        'PRESS W FOR READY',
        0xFF9696 
      );
    }
    
    // Add the new text to the container
    this.add(this.statusText);
    
    // Update game store
    gameStore.setPlayerReady(this.playerId, ready);
  }
}
