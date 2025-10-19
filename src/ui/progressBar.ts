import type { PlayerId } from '../types/global';

export class ProgressBar extends Phaser.GameObjects.Container {
  private trackLeft: Phaser.GameObjects.Image;
  private trackMiddle: Phaser.GameObjects.Image;
  private trackRight: Phaser.GameObjects.Image;
  private progressLeft: Phaser.GameObjects.Image;
  private progressMiddle: Phaser.GameObjects.Image;
  private progressRight: Phaser.GameObjects.Image;
  private playerRockets: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private progress: [number, number] = [0, 0];
  private barWidth: number;
  private barHeight: number;
  private isHorizontal: boolean;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 40,
    height: number = 600
  ) {
    super(scene, x, y);
    
    // Apply internal padding and width adjustments
    this.barWidth = width;
    this.barHeight = height;
    this.isHorizontal = width > height; // Determine orientation based on dimensions
    
    // Create track using bar assets
    this.createTrack();
    
    // Create player rocket markers
    this.playerRockets = [
      scene.add.image(0, 0, 'orange-ship'), // Player 0 (orange)
      scene.add.image(0, 0, 'purple-ship')  // Player 1 (purple)
    ];
    this.add(this.playerRockets[0]);
    this.add(this.playerRockets[1]);
    
    this.updateRockets();
    
    scene.add.existing(this);
  }
  
  private createTrack(): void {
    if (this.isHorizontal) {
      // Horizontal progress bar using large bar assets - with internal padding
      const padding = 120; // Internal padding to avoid minimap
      const leftWidth = 20; // Fixed width for left cap
      const rightWidth = 20; // Fixed width for right cap
      const middleWidth = this.barWidth - leftWidth - rightWidth - (padding * 2); // Adjustable middle width with padding
      
      // Gray track (background) - positioned with padding
      const trackStartX = -this.barWidth/2 + leftWidth/2 + padding;
      const trackEndX = this.barWidth/2 - rightWidth/2 - padding;
      
      this.trackLeft = this.scene.add.image(trackStartX, 0, 'bar-round-large-l');
      this.trackLeft.setDisplaySize(leftWidth, this.barHeight);
      this.add(this.trackLeft);
      
      this.trackMiddle = this.scene.add.image(0, 0, 'bar-round-large-m');
      this.trackMiddle.setDisplaySize(middleWidth, this.barHeight);
      this.add(this.trackMiddle);
      
      this.trackRight = this.scene.add.image(trackEndX, 0, 'bar-round-large-r');
      this.trackRight.setDisplaySize(rightWidth, this.barHeight);
      this.add(this.trackRight);
      
      // Blue progress overlay (starts with width 0) - positioned with padding
      this.progressLeft = this.scene.add.image(trackStartX, 0, 'bar-round-large-l');
      this.progressLeft.setDisplaySize(leftWidth, this.barHeight);
      this.progressLeft.setTint(0x0088ff); // Blue tint
      this.progressLeft.setVisible(false); // Start hidden
      this.add(this.progressLeft);
      
      this.progressMiddle = this.scene.add.image(0, 0, 'bar-round-large-m');
      this.progressMiddle.setDisplaySize(0, this.barHeight); // Start with 0 width
      this.progressMiddle.setTint(0x0088ff); // Blue tint
      this.add(this.progressMiddle);
      
      this.progressRight = this.scene.add.image(trackEndX, 0, 'bar-round-large-r');
      this.progressRight.setDisplaySize(rightWidth, this.barHeight);
      this.progressRight.setTint(0x0088ff); // Blue tint
      this.progressRight.setVisible(false); // Start hidden
      this.add(this.progressRight);
    } else {
      // Vertical progress bar using small bar assets
      const segmentHeight = this.barHeight / 3;
      
      this.trackLeft = this.scene.add.image(0, -this.barHeight/2 + segmentHeight/2, 'bar-gray-round-outline-small-l');
      this.trackLeft.setDisplaySize(this.barWidth, segmentHeight);
      this.add(this.trackLeft);
      
      this.trackMiddle = this.scene.add.image(0, 0, 'bar-gray-round-outline-small-m');
      this.trackMiddle.setDisplaySize(this.barWidth, segmentHeight);
      this.add(this.trackMiddle);
      
      this.trackRight = this.scene.add.image(0, this.barHeight/2 - segmentHeight/2, 'bar-gray-round-outline-small-r');
      this.trackRight.setDisplaySize(this.barWidth, segmentHeight);
      this.add(this.trackRight);
    }
  }
  
  private updateRockets(): void {
    // Scale down the rockets for the progress bar
    const rocketScale = 0.3;
    this.playerRockets[0].setScale(rocketScale);
    this.playerRockets[1].setScale(rocketScale);
    
    if (this.isHorizontal) {
      // Horizontal progress bar - rockets move left to right with padding
      const padding = 120;
      const leftWidth = 20;
      const rightWidth = 20;
      const middleWidth = this.barWidth - leftWidth - rightWidth - (padding * 2);
      
      // Calculate rocket position with padding and align rocket HEAD to progress end
      const startX = -this.barWidth/2 + leftWidth + padding;
      const player0X = startX + (this.progress[0] * middleWidth);
      const player1X = startX + (this.progress[1] * middleWidth);
      
      // Adjust rocket position so the HEAD is at the progress end, not the center
      const rocketHeadOffset = 15; // Offset to position rocket head at progress end
      const adjustedPlayer0X = player0X - rocketHeadOffset;
      const adjustedPlayer1X = player1X - rocketHeadOffset;
      
      this.playerRockets[0].setPosition(adjustedPlayer0X, -this.barHeight/2 - 20);
      this.playerRockets[1].setPosition(adjustedPlayer1X, this.barHeight/2 + 20);
      
      // Rotate rockets 90 degrees to face the direction of progress (right)
      this.playerRockets[0].setRotation(Math.PI/2);
      this.playerRockets[1].setRotation(-Math.PI/2);
    } else {
      // Vertical progress bar - rockets move bottom to top
      const player0Y = this.barHeight/2 - (this.progress[0] * this.barHeight);
      const player1Y = this.barHeight/2 - (this.progress[1] * this.barHeight);
      
      this.playerRockets[0].setPosition(-this.barWidth/2 - 20, player0Y);
      this.playerRockets[1].setPosition(this.barWidth/2 + 20, player1Y);
      
      // Rotate rockets 90 degrees to face the direction of progress (up)
      this.playerRockets[0].setRotation(0);
      this.playerRockets[1].setRotation(Math.PI);
    }
    
    // Hide player 1 rocket for singleplayer mode
    this.playerRockets[1].setVisible(false);
  }
  
  setProgress(playerId: PlayerId, normalizedProgress: number): void {
    // Clamp progress between 0 and 1
    this.progress[playerId] = Math.max(0, Math.min(1, normalizedProgress));
    this.updateRockets();
    this.updateProgressOverlay();
  }
  
  private updateProgressOverlay(): void {
    if (this.isHorizontal && this.progressLeft && this.progressMiddle && this.progressRight) {
      // Calculate the width of the blue progress overlay with padding
      const padding = 120;
      const leftWidth = 20; // Fixed width for left cap
      const rightWidth = 20; // Fixed width for right cap
      const maxMiddleWidth = this.barWidth - leftWidth - rightWidth - (padding * 2);
      const progressWidth = this.progress[0] * maxMiddleWidth;
      
      // Update the middle section width based on progress
      this.progressMiddle.setDisplaySize(progressWidth, this.barHeight);
      
      // Position the middle section correctly with padding
      const startX = -this.barWidth/2 + leftWidth + padding;
      const middleX = startX + progressWidth/2;
      this.progressMiddle.setPosition(middleX, 0);
      
      // Show/hide the left cap based on progress
      this.progressLeft.setVisible(this.progress[0] > 0);
      
      // Show/hide the right cap when progress reaches the end
      const isAtEnd = this.progress[0] >= 0.99; // Use 0.99 to account for floating point precision
      this.progressRight.setVisible(isAtEnd);
    }
  }
  
  getProgress(playerId: PlayerId): number {
    return this.progress[playerId];
  }
  
  reset(): void {
    this.progress = [0, 0];
    this.updateRockets();
    this.updateProgressOverlay();
  }
}