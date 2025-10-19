import { Button } from '../ui';

export default class MenuScene extends Phaser.Scene {
  
  constructor() {
    super('Menu');
  }
  
  create(): void {
    console.log('MenuScene: Creating menu...');
    
    // Don't stop VisualizerTestScene - let it persist for calibration
    // Only stop it if we're switching away from wand mode entirely

    // Add background image on top (so we can see if it's working)
    const background = this.add.image(640, 360, 'background');
    background.setDisplaySize(1280, 720);
    background.setDepth(1); // Above the red rectangle
 
    
    // Title - "ROCKET RACER" with exact Figma specs and proper Press Start 2P font
    this.add.text(640, 162, 'ROCKET RACER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '76px',
      color: '#edeeff',
      align: 'center'
    }).setOrigin(0.5).setShadow(0, 0, '#4800ff', 12.2, false, true).setDepth(100);
    
    // Create buttons using the Button component
    const playButton = new Button(this, {
      x: 640,
      y: 333,
      text: 'Play',
      width: 431,
      height: 86,
      fontSize: 41,
      color: 0xedeeff,
      enabled: true,
      onClick: () => {
        console.log('Play button clicked');
        this.scene.start('SelectPlayers');
      }
    });
    this.add.existing(playButton);
    playButton.setDepth(100);
    
    const leaderboardButton = new Button(this, {
      x: 640,
      y: 452,
      text: 'Leaderboard',
      width: 431,
      height: 86,
      fontSize: 41,
      color: 0xedeeff,
      enabled: true,
      onClick: () => {
        console.log('Leaderboard button clicked');
        this.scene.start('Leaderboard');
      }
    });
    this.add.existing(leaderboardButton);
    leaderboardButton.setDepth(100);
    
    const settingsButton = new Button(this, {
      x: 640,
      y: 562,
      text: 'Settings',
      width: 431,
      height: 86,
      fontSize: 41,
      color: 0xedeeff,
      enabled: true,
      onClick: () => {
        console.log('Settings button clicked');
        this.scene.start('Settings');
      }
    });
    this.add.existing(settingsButton);
    settingsButton.setDepth(100);
    
    console.log('MenuScene: Menu created successfully');
  }

}
