import { BitmapTextHelper } from '../ui/bitmapText';
import { Button } from '../ui/button';
import { GAME_SETTINGS } from '../core/settings';
import { leaderboardStore } from '../core/leaderboard-store';
import type { LeaderboardEntry } from '../types/global';

export default class LeaderboardScene extends Phaser.Scene {
  private background: Phaser.GameObjects.Image;
  private title: Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText;
  private leaderboardContainer: Phaser.GameObjects.Container;
  private backButton: Button;
  private clearButton: Button;
  private entries: LeaderboardEntry[] = [];
  
  constructor() {
    super('Leaderboard');
  }
  
  create(): void {
    this.createBackground();
    this.createTitle();
    this.loadLeaderboardData();
    this.createLeaderboard();
    this.createButtons();
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
      100,
      'LEADERBOARD',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.title.setDepth(100);
  }
  
  private loadLeaderboardData(): void {
    this.entries = leaderboardStore.getTopScores(10);
  }
  
  private createLeaderboard(): void {
    // Create leaderboard container
    this.leaderboardContainer = this.add.container(GAME_SETTINGS.CANVAS_WIDTH / 2, 350);
    this.leaderboardContainer.setDepth(100);
    
    if (this.entries.length === 0) {
      this.createEmptyLeaderboard();
    } else {
      this.createScoreEntries();
    }
  }
  
  private createEmptyLeaderboard(): void {
    const emptyText = BitmapTextHelper.createHUDText(
      this,
      0,
      0,
      'NO SCORES YET',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.leaderboardContainer.add(emptyText);
    
    const subText = BitmapTextHelper.createHUDText(
      this,
      0,
      40,
      'PLAY A GAME TO GET STARTED!',
      GAME_SETTINGS.COLORS.WHITE
    );
    this.leaderboardContainer.add(subText);
  }
  
  private createScoreEntries(): void {
    // Header
    const headerBg = this.add.rectangle(0, -120, 800, 40, 0x000000, 0.8);
    headerBg.setStrokeStyle(2, GAME_SETTINGS.COLORS.WHITE);
    this.leaderboardContainer.add(headerBg);
    
    const rankHeader = this.add.text(-350, -120, 'RANK', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(rankHeader);
    
    const nameHeader = this.add.text(0, -120, 'NAME', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(nameHeader);
    
    const scoreHeader = this.add.text(350, -120, 'SCORE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(scoreHeader);
    
    // Score entries
    this.entries.forEach((entry, index) => {
      const y = -60 + (index * 35);
      this.createScoreEntry(entry, index + 1, y);
    });
  }
  
  private createScoreEntry(entry: LeaderboardEntry, rank: number, y: number): void {
    // Background for entry
    const entryBg = this.add.rectangle(0, y, 800, 30, 0x000000, 0.6);
    if (rank <= 3) {
      // Highlight top 3
      const colors = [0xffd700, 0xc0c0c0, 0xcd7f32]; // Gold, Silver, Bronze
      entryBg.setStrokeStyle(2, colors[rank - 1]);
    }
    this.leaderboardContainer.add(entryBg);
    
    // Rank
    const rankText = this.add.text(-350, y, `#${rank}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: rank <= 3 ? '#ffd700' : '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(rankText);
    
    // Name
    const nameText = this.add.text(0, y, entry.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(nameText);
    
    // Score
    const scoreText = this.add.text(350, y, entry.score.toLocaleString(), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.leaderboardContainer.add(scoreText);
  }
  
  private createButtons(): void {
    const hasScores = this.entries.length > 0;
    
    // Back to Menu button - center if no clear button, offset left if clear button present
    const backButtonX = hasScores 
      ? GAME_SETTINGS.CANVAS_WIDTH / 2 - 120  // Offset left when clear button is present
      : GAME_SETTINGS.CANVAS_WIDTH / 2;       // Center when no clear button
    
    this.backButton = new Button(this, {
      x: backButtonX,
      y: GAME_SETTINGS.CANVAS_HEIGHT - 80,
      text: 'BACK TO MENU',
      width: 200,
      height: 60,
      fontSize: 20,
      color: GAME_SETTINGS.COLORS.WHITE,
      enabled: true,
      onClick: () => this.scene.start('Menu')
    });
    this.add.existing(this.backButton);
    this.backButton.setDepth(100);
    
    // Clear Scores button (only show if there are scores)
    if (hasScores) {
      this.clearButton = new Button(this, {
        x: GAME_SETTINGS.CANVAS_WIDTH / 2 + 120,  // Offset right
        y: GAME_SETTINGS.CANVAS_HEIGHT - 80,
        text: 'CLEAR SCORES',
        width: 200,
        height: 60,
        fontSize: 20,
        color: GAME_SETTINGS.COLORS.RED,
        enabled: true,
        onClick: () => this.clearScores()
      });
      this.add.existing(this.clearButton);
      this.clearButton.setDepth(100);
    }
  }
  
  private clearScores(): void {
    // Show confirmation dialog
    const confirmBg = this.add.rectangle(640, 360, 500, 200, 0x000000, 0.9);
    confirmBg.setStrokeStyle(3, GAME_SETTINGS.COLORS.RED);
    confirmBg.setDepth(200);
    
    const confirmText = BitmapTextHelper.createHUDText(
      this,
      640,
      320,
      'CLEAR ALL SCORES?',
      GAME_SETTINGS.COLORS.RED
    );
    confirmText.setDepth(201);
    
    const yesButton = new Button(this, {
      x: 540,
      y: 400,
      text: 'YES',
      width: 100,
      height: 40,
      fontSize: 16,
      color: GAME_SETTINGS.COLORS.RED,
      enabled: true,
      onClick: () => {
        leaderboardStore.clearScores();
        this.scene.restart();
      }
    });
    this.add.existing(yesButton);
    yesButton.setDepth(201);
    
    const noButton = new Button(this, {
      x: 740,
      y: 400,
      text: 'NO',
      width: 100,
      height: 40,
      fontSize: 16,
      color: GAME_SETTINGS.COLORS.WHITE,
      enabled: true,
      onClick: () => {
        confirmBg.destroy();
        confirmText.destroy();
        yesButton.destroy();
        noButton.destroy();
      }
    });
    this.add.existing(noButton);
    noButton.setDepth(201);
  }
}
