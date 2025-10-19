import { BitmapTextHelper } from '../ui/bitmapText';
import { Button } from '../ui/button';
import { GAME_SETTINGS } from '../core/settings';
import { leaderboardStore } from '../core/leaderboard-store';

export default class NameEntryScene extends Phaser.Scene {
  private background: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private inputContainer: Phaser.GameObjects.Container;
  private inputField: Phaser.GameObjects.Text;
  private inputCursor: Phaser.GameObjects.Text;
  private charCountText: Phaser.GameObjects.Text;
  private saveButton: Button;
  private noThanksButton: Button;
  
  private playerName: string = '';
  private finalScore: number = 0;
  private cursorBlinkTimer: Phaser.Time.TimerEvent | null = null;
  private readonly MAX_NAME_LENGTH = 13;

  constructor() {
    super('NameEntry');
  }

  init(data: { score: number }): void {
    this.finalScore = data.score || 0;
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    this.createScoreDisplay();
    this.createInputField();
    this.createButtons();
    this.setupInputHandling();
    this.startCursorBlink();
  }

  private createBackground(): void {
    this.background = this.add.image(640, 360, 'background');
    this.background.setDisplaySize(1280, 720);
    this.background.setDepth(1);
  }

  private createTitle(): void {
    this.title = BitmapTextHelper.createTitleText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      150,
      'NEW HIGH SCORE!',
      GAME_SETTINGS.COLORS.YELLOW
    );
    this.title.setDepth(100);
  }

  private createScoreDisplay(): void {
    this.scoreText = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      220,
      `SCORE: ${this.finalScore.toLocaleString()}`,
      GAME_SETTINGS.COLORS.ORANGE
    );
    this.scoreText.setDepth(100);
  }

  private createInputField(): void {
    // Create input container
    this.inputContainer = this.add.container(GAME_SETTINGS.CANVAS_WIDTH / 2, 320);
    this.inputContainer.setDepth(100);

    // Background for input field
    const inputBg = this.add.rectangle(0, 0, 400, 60, 0x000000, 0.8);
    inputBg.setStrokeStyle(3, GAME_SETTINGS.COLORS.WHITE);
    this.inputContainer.add(inputBg);

    // Label
    const label = BitmapTextHelper.createHUDText(
      this,
      0,
      -50,
      'ENTER YOUR NAME:',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.inputContainer.add(label);

    // Input field text
    this.inputField = this.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.inputContainer.add(this.inputField);

    // Cursor
    this.inputCursor = this.add.text(0, 0, '|', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.inputContainer.add(this.inputCursor);

    // Character count
    this.charCountText = this.add.text(0, 40, `0/${this.MAX_NAME_LENGTH}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5);
    this.inputContainer.add(this.charCountText);
  }

  private createButtons(): void {
    // Save button (initially disabled)
    this.saveButton = new Button(this, {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2 - 120,
      y: 450,
      text: 'SAVE',
      width: 200,
      height: 60,
      fontSize: 24,
      color: GAME_SETTINGS.COLORS.WHITE,
      enabled: false,
      onClick: () => this.saveScore()
    });
    this.add.existing(this.saveButton);
    this.saveButton.setDepth(100);

    // No Thanks button
    this.noThanksButton = new Button(this, {
      x: GAME_SETTINGS.CANVAS_WIDTH / 2 + 120,
      y: 450,
      text: 'NO THANKS',
      width: 200,
      height: 60,
      fontSize: 24,
      color: GAME_SETTINGS.COLORS.WHITE,
      enabled: true,
      onClick: () => this.skipScore()
    });
    this.add.existing(this.noThanksButton);
    this.noThanksButton.setDepth(100);
  }

  private setupInputHandling(): void {
    // Handle keyboard input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyInput(event);
    });
  }

  private handleKeyInput(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      if (this.playerName.length > 0) {
        this.playerName = this.playerName.slice(0, -1);
        this.updateInputDisplay();
      }
    } else if (event.key === 'Enter') {
      if (this.playerName.trim().length > 0) {
        this.saveScore();
      }
    } else if (event.key === 'Escape') {
      this.skipScore();
    } else if (event.key.length === 1 && this.playerName.length < this.MAX_NAME_LENGTH) {
      // Only allow printable characters
      const char = event.key;
      if (/[a-zA-Z0-9\s\-_\.]/.test(char)) {
        this.playerName += char.toUpperCase();
        this.updateInputDisplay();
      }
    }
  }

  private updateInputDisplay(): void {
    this.inputField.setText(this.playerName);
    this.charCountText.setText(`${this.playerName.length}/${this.MAX_NAME_LENGTH}`);
    
    // Update save button state
    const hasValidName = this.playerName.trim().length > 0;
    this.saveButton.setEnabled(hasValidName);
    
    // Update cursor position
    this.updateCursorPosition();
  }

  private updateCursorPosition(): void {
    // Calculate cursor position based on text width
    const textWidth = this.inputField.width;
    const cursorX = textWidth / 2 + 5;
    this.inputCursor.setX(cursorX);
  }

  private startCursorBlink(): void {
    this.cursorBlinkTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.inputCursor.setVisible(!this.inputCursor.visible);
      },
      loop: true
    });
  }

  private saveScore(): void {
    if (this.playerName.trim().length === 0) {
      return;
    }

    try {
      leaderboardStore.addScore(this.playerName.trim(), this.finalScore);
      this.scene.start('Leaderboard');
    } catch (error) {
      console.error('Failed to save score:', error);
      // Still go to leaderboard even if save fails
      this.scene.start('Leaderboard');
    }
  }

  private skipScore(): void {
    this.scene.start('Menu');
  }

  destroy(): void {
    if (this.cursorBlinkTimer) {
      this.cursorBlinkTimer.destroy();
    }
    super.destroy();
  }
}
