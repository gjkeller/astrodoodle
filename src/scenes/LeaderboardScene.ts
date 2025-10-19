import { BitmapTextHelper } from '../ui/bitmapText';
import { Button } from '../ui/button';
import { GAME_SETTINGS } from '../core/settings';

export default class LeaderboardScene extends Phaser.Scene {
  private title: Phaser.GameObjects.Text;
  private comingSoonText: Phaser.GameObjects.Text;
  private backButton: UIButton;
  
  constructor() {
    super('Leaderboard');
  }
  
  create(): void {
    this.createTitle();
    this.createComingSoonText();
    this.createBackButton();
  }
  
  private createTitle(): void {
    this.title = BitmapTextHelper.createTitleText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      200,
      'LEADERBOARD',
      GAME_SETTINGS.COLORS.WHITE
    );
  }
  
  private createComingSoonText(): void {
    this.comingSoonText = BitmapTextHelper.createHUDText(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'Coming Soon',
      GAME_SETTINGS.COLORS.WHITE
    );
  }
  
  private createBackButton(): void {
    this.backButton = new UIButton(
      this,
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT - 100,
      'BACK TO MENU',
      200,
      60,
      () => this.scene.start('Menu')
    );
  }
}
