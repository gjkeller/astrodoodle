import { ASSETS } from '../assets';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
    console.log('BootScene: Constructor called');
  }
  
  preload(): void {
    console.log('BootScene: preload() called - Loading assets...');
    
    // Load assets using ES imports for Vite HMR support
    this.load.image('button-bg', ASSETS.buttonBg);
    this.load.image('button-gray', ASSETS.buttonGray);
    this.load.image('background', ASSETS.background);
    this.load.image('background-blurred', ASSETS.backgroundBlurred);
    this.load.image('game-background', ASSETS.gameBackground);
    this.load.image('game-background-xl', ASSETS.gameBackgroundXl);
    this.load.image('cursor', ASSETS.cursor);
    this.load.image('orange-ship', ASSETS.orangeShip);
    this.load.image('purple-ship', ASSETS.purpleShip);
    this.load.image('meteor1', ASSETS.meteor1);
    this.load.spritesheet('explosion', ASSETS.explosion, { frameWidth: 96, frameHeight: 96 });
    this.load.image('missile', ASSETS.missile);
    
    // Load character images
    this.load.image('anshul', ASSETS.anshulImage);
    
    // Load glyph sprites
    this.load.image('glyph-null', ASSETS.nullGlyph);
    this.load.image('glyph-star', ASSETS.starGlyph);
    this.load.image('glyph-triangle', ASSETS.triangleGlyph);
    this.load.image('glyph-arrow', ASSETS.arrowGlyph);
    
    // Load progress bar assets
    this.load.image('bar-gray-round-outline-small-l', ASSETS.barGrayRoundOutlineSmallL);
    this.load.image('bar-gray-round-outline-small-m', ASSETS.barGrayRoundOutlineSmallM);
    this.load.image('bar-gray-round-outline-small-r', ASSETS.barGrayRoundOutlineSmallR);
    this.load.image('bar-round-large-l', ASSETS.barRoundLargeL);
    this.load.image('bar-round-large-m', ASSETS.barRoundLargeM);
    this.load.image('bar-round-large-r', ASSETS.barRoundLargeR);
    
    // Add load event listeners for debugging
    this.load.on('filecomplete', (key: string, type: string) => {
      console.log('Asset loaded:', key, type);
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Asset load error:', file.key, file.url);
    });
  }
  
  create(): void {
    console.log('BootScene: create() called - Assets loaded, checking...');
    
    // Set up custom cursor using Phaser's built-in method
    this.setupCustomCursor();
    
    // Wait for fonts to load before starting the menu
    this.waitForFonts().then(() => {
      console.log('Fonts loaded, starting Menu scene');
      this.scene.start('Menu');
    });
  }
  
  private setupCustomCursor(): void {
    // Use Phaser's built-in setDefaultCursor method
    // This is the idiomatic way to set a custom cursor in Phaser
    this.input.setDefaultCursor('url(' + ASSETS.cursor + '), auto');
    console.log('Custom cursor set using setDefaultCursor');
  }
  
  private async waitForFonts(): Promise<void> {
    // Wait for fonts to be ready
    await document.fonts.ready;
    console.log('All fonts are ready');
    
    // Additional check for our specific fonts
    const pressStart2P = new FontFace('Press Start 2P', 'url(/PressStart2P-Regular.ttf)');
    const neometric = new FontFace('Neometric', 'url(/Neometric-Regular.otf)');
    
    try {
      await pressStart2P.load();
      await neometric.load();
      console.log('Custom fonts loaded successfully');
    } catch (error) {
      console.warn('Font loading warning:', error);
      // Continue anyway - fallback fonts will be used
    }
  }
  
}
