import { GAME_SETTINGS } from '../core/settings';

export class BitmapTextHelper {
  private static bitmapFontAvailable: boolean | null = null;

  /**
   * Check if the Press Start 2P bitmap font is available
   */
  private static checkBitmapFontAvailability(scene: Phaser.Scene): boolean {
    if (this.bitmapFontAvailable !== null) {
      return this.bitmapFontAvailable;
    }

    // Check if bitmap font texture exists
    const textureManager = scene.textures;
    this.bitmapFontAvailable = textureManager.exists('press2p');
    
    if (this.bitmapFontAvailable) {
      console.log('BitmapTextHelper: Press Start 2P bitmap font detected');
    } else {
      console.log('BitmapTextHelper: Using fallback Text rendering for pure white text');
    }
    
    return this.bitmapFontAvailable;
  }

  /**
   * Create text using BitmapText for crisp rendering
   */
  private static createBitmapTextObject(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    options: {
      size?: number;
      tint?: number;
      align?: 'left' | 'center' | 'right';
    } = {}
  ): Phaser.GameObjects.BitmapText {
    const { size = 16, tint = GAME_SETTINGS.COLORS.WHITE, align = 'center' } = options;
    
    const bitmapText = scene.add.bitmapText(x, y, 'press2p', text, size);
    
    // Set tint for color
    bitmapText.setTint(tint);
    
    // Set origin based on alignment
    switch (align) {
      case 'left':
        bitmapText.setOrigin(0, 0.5);
        break;
      case 'right':
        bitmapText.setOrigin(1, 0.5);
        break;
      case 'center':
      default:
        bitmapText.setOrigin(0.5, 0.5);
        break;
    }
    
    // Configure for crisp rendering
    bitmapText.setBlendMode(Phaser.BlendModes.NORMAL);
    
    // Set nearest neighbor filtering for crisp pixels
    const texture = bitmapText.texture;
    if (texture) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    
    // Enable pixel rounding on camera
    scene.cameras.main.roundPixels = true;
    
    return bitmapText;
  }

  /**
   * Create text using regular Text with enhanced rendering for pure white
   */
  private static createFallbackTextObject(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    options: {
      size?: number;
      tint?: number;
      align?: 'left' | 'center' | 'right';
    } = {}
  ): Phaser.GameObjects.Text {
    const { size = 16, tint = GAME_SETTINGS.COLORS.WHITE, align = 'center' } = options;
    
    // Snap positions to integers for crisp rendering
    const snappedX = Math.round(x);
    const snappedY = Math.round(y);
    
    const textObj = scene.add.text(snappedX, snappedY, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${size}px`,
      color: `#${tint.toString(16).padStart(6, '0')}`,
      align: align === 'center' ? 'center' : align === 'left' ? 'left' : 'right',
      stroke: '#000000', // Black stroke to keep white centers pure
      strokeThickness: 2,
      resolution: window.devicePixelRatio || 2 // High resolution for crisp text
    });
    
    // Set origin based on alignment
    switch (align) {
      case 'left':
        textObj.setOrigin(0, 0.5);
        break;
      case 'right':
        textObj.setOrigin(1, 0.5);
        break;
      case 'center':
      default:
        textObj.setOrigin(0.5, 0.5);
        break;
    }
    
    // Configure for crisp rendering
    textObj.setBlendMode(Phaser.BlendModes.NORMAL);
    textObj.setAlpha(1.0);
    
    // Enable pixel rounding on camera
    scene.cameras.main.roundPixels = true;
    
    return textObj;
  }

  static createBitmapText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    options: {
      size?: number;
      tint?: number;
      align?: 'left' | 'center' | 'right';
    } = {}
  ): Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText {
    // Check if bitmap font is available
    if (this.checkBitmapFontAvailability(scene)) {
      return this.createBitmapTextObject(scene, x, y, text, options);
    } else {
      return this.createFallbackTextObject(scene, x, y, text, options);
    }
  }
  
  static createTitleText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    tint: number = GAME_SETTINGS.COLORS.WHITE
  ): Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText {
    return this.createBitmapText(scene, x, y, text, {
      size: 32,
      tint,
      align: 'center'
    });
  }
  
  static createHUDText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    tint: number = GAME_SETTINGS.COLORS.WHITE
  ): Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText {
    return this.createBitmapText(scene, x, y, text, {
      size: 16,
      tint,
      align: 'center'
    });
  }
  
  static createButtonText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    tint: number = GAME_SETTINGS.COLORS.WHITE
  ): Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText {
    return this.createBitmapText(scene, x, y, text, {
      size: 20,
      tint,
      align: 'center'
    });
  }
}
