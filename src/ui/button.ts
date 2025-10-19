import { GAME_SETTINGS } from '../core/settings';

export interface ButtonOptions {
  x: number;
  y: number;
  text: string;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  enabled?: boolean;
  style?: 'default' | 'gray';
  onClick?: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Image;
  private text: Phaser.GameObjects.Text;
  private isEnabled: boolean;
  private onClickCallback?: () => void;

  constructor(scene: Phaser.Scene, options: ButtonOptions) {
    super(scene, options.x, options.y);

    const {
      text,
      width = 431,
      height = 86,
      fontSize = 41,
      color = 0xedeeff,
      enabled = true,
      style = 'default',
      onClick
    } = options;

    this.isEnabled = enabled;
    this.onClickCallback = onClick;

    // Create button background based on style
    const backgroundKey = style === 'gray' ? 'button-gray' : 'button-bg';
    this.background = scene.add.image(0, 0, backgroundKey);
    this.background.setScale(width / this.background.width, height / this.background.height);
    this.add(this.background);

    // Create button text
    this.text = scene.add.text(0, 0, text, {
      fontFamily: '"Neometric", sans-serif',
      fontSize: `${fontSize}px`,
      color: `#${color.toString(16).padStart(6, '0')}`,
      align: 'center'
    }).setOrigin(0.5);
    this.add(this.text);

    // Make interactive
    this.setSize(width, height);
    this.setInteractive();

    // Add hover effects
    this.on('pointerover', () => {
      if (this.isEnabled) {
        this.background.setTint(0xcccccc);
      }
    });

    this.on('pointerout', () => {
      if (this.isEnabled) {
        this.background.clearTint();
      }
    });

    this.on('pointerdown', () => {
      if (this.isEnabled && this.onClickCallback) {
        this.onClickCallback();
      }
    });

    // Set initial state
    this.setEnabled(this.isEnabled);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.background.clearTint();
      this.text.setAlpha(1);
      this.setInteractive();
    } else {
      this.background.setTint(0x666666);
      this.text.setAlpha(0.5);
      this.disableInteractive();
    }
  }

  setText(text: string): void {
    this.text.setText(text);
  }

  setColor(color: number): void {
    this.text.setColor(`#${color.toString(16).padStart(6, '0')}`);
  }
}