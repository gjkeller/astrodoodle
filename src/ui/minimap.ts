import { GAME_SETTINGS } from '../core/settings';

interface KeyEvent {
  key: string;
  timestamp: number;
}

export class Minimap extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private keyEvents: KeyEvent[] = [];
  private keyDisplays: Phaser.GameObjects.Text[] = [];
  private maxKeys: number = 3;
  private timeWindow: number = 500; // 0.5 seconds
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.createBackground();
    this.createKeyDisplays();
    
    scene.add.existing(this);
    this.setDepth(200);
  }
  
  private createBackground(): void {
    this.background = this.scene.add.graphics();
    this.background.fillStyle(0x000000, 0.7);
    this.background.lineStyle(2, GAME_SETTINGS.COLORS.WHITE);
    this.background.fillRoundedRect(-GAME_SETTINGS.MINIMAP_WIDTH/2, -GAME_SETTINGS.MINIMAP_HEIGHT/2, 
                                   GAME_SETTINGS.MINIMAP_WIDTH, GAME_SETTINGS.MINIMAP_HEIGHT, 8);
    this.background.strokeRoundedRect(-GAME_SETTINGS.MINIMAP_WIDTH/2, -GAME_SETTINGS.MINIMAP_HEIGHT/2, 
                                     GAME_SETTINGS.MINIMAP_WIDTH, GAME_SETTINGS.MINIMAP_HEIGHT, 8);
    this.add(this.background);
  }
  
  private createKeyDisplays(): void {
    for (let i = 0; i < this.maxKeys; i++) {
      const keyDisplay = this.scene.add.text(-30 + (i * 30), 0, '', {
        fontSize: '28px', // Even bigger text
        fontFamily: '"Press Start 2P", monospace', // Ensure Press Start 2P
        color: '#ffffff',
        align: 'center'
      });
      keyDisplay.setOrigin(0.5, 0.5); // Center both horizontally and vertically
      keyDisplay.setVisible(false);
      this.keyDisplays.push(keyDisplay);
      this.add(keyDisplay);
    }
  }
  
  addKeyPress(key: string): void {
    const now = this.scene.time.now;
    
    // Add new key event
    this.keyEvents.push({ key, timestamp: now });
    
    // Remove old events outside time window
    this.keyEvents = this.keyEvents.filter(event => 
      now - event.timestamp <= this.timeWindow
    );
    
    // Keep only the most recent maxKeys events (FIFO)
    if (this.keyEvents.length > this.maxKeys) {
      this.keyEvents = this.keyEvents.slice(-this.maxKeys);
    }
    
    this.updateDisplay();
  }
  
  private updateDisplay(): void {
    // Clear all displays
    this.keyDisplays.forEach(display => display.setVisible(false));
    
    // Show current key events (most recent first)
    const now = this.scene.time.now;
    const validEvents = this.keyEvents.filter(event => 
      now - event.timestamp <= this.timeWindow
    );
    
    validEvents.forEach((event, index) => {
      if (index < this.maxKeys) {
        const display = this.keyDisplays[index];
        display.setText(event.key);
        display.setVisible(true);
        
        // Highlight the most recent key
        if (index === validEvents.length - 1) {
          display.setTint(GAME_SETTINGS.COLORS.YELLOW);
        } else {
          display.setTint(GAME_SETTINGS.COLORS.WHITE);
        }
      }
    });
  }
  
  update(): void {
    // Clean up old events
    const now = this.scene.time.now;
    this.keyEvents = this.keyEvents.filter(event => 
      now - event.timestamp <= this.timeWindow
    );
    
    this.updateDisplay();
  }
}