import type { PlayerId, StrokePoint } from '../types/global';
import { BitmapTextHelper } from './bitmapText';
import { Minimap } from './minimap';
import { GAME_SETTINGS } from '../core/settings';

export class PlayerHUD extends Phaser.GameObjects.Container {
  private scoreText: Phaser.GameObjects.Text;
  private multiplierText: Phaser.GameObjects.Text;
  private minimap: Minimap;
  private playerId: PlayerId;
  private multiplier: number = 1;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    playerId: PlayerId
  ) {
    super(scene, x, y);
    
    this.playerId = playerId;
    const playerColor = playerId === 0 ? GAME_SETTINGS.COLORS.ORANGE : GAME_SETTINGS.COLORS.PURPLE;
    
    // Create score text at top
    this.scoreText = BitmapTextHelper.createHUDText(scene, 0, -250, '0  PTS', playerColor);
    this.add(this.scoreText);
    
    // Create multiplier text
    this.multiplierText = BitmapTextHelper.createHUDText(scene, 0, 200, '*', playerColor);
    this.add(this.multiplierText);
    
    // Create minimap at bottom
    this.minimap = new Minimap(scene, 0, 250);
    this.add(this.minimap);
    
    scene.add.existing(this);
  }
  
  bumpScore(delta: number): void {
    const currentScore = parseInt(this.scoreText.text.split(' ')[0]) || 0;
    const newScore = currentScore + delta;
    this.scoreText.setText(`${newScore}  PTS`);
  }
  
  setScore(score: number): void {
    this.scoreText.setText(`${score}  PTS`);
  }
  
  onGood(): void {
    // Increase multiplier up to 4
    this.multiplier = Math.min(GAME_SETTINGS.MAX_MULTIPLIER, this.multiplier + 1);
    this.updateMultiplierDisplay();
    
    // Flash minimap green
    this.minimap.flash(GAME_SETTINGS.COLORS.GREEN);
  }
  
  onBad(): void {
    // Decrease multiplier down to 1
    this.multiplier = Math.max(GAME_SETTINGS.MIN_MULTIPLIER, 1);
    this.updateMultiplierDisplay();
    
    // Flash minimap red
    this.minimap.flash(GAME_SETTINGS.COLORS.RED);
  }
  
  setMultiplier(mult: number): void {
    this.multiplier = Math.max(GAME_SETTINGS.MIN_MULTIPLIER, Math.min(GAME_SETTINGS.MAX_MULTIPLIER, mult));
    this.updateMultiplierDisplay();
  }
  
  private updateMultiplierDisplay(): void {
    const stars = '*'.repeat(this.multiplier);
    this.multiplierText.setText(stars);
  }
  
  setStroke(points: StrokePoint[]): void {
    this.minimap.setStroke(points);
  }
  
  clearStroke(): void {
    this.minimap.clearStroke();
  }
  
  getMultiplier(): number {
    return this.multiplier;
  }
}
