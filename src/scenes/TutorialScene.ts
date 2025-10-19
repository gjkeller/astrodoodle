import { GAME_SETTINGS } from '../core/settings';

interface TutorialSlide {
  title: string;
  content: string[];
}

export default class TutorialScene extends Phaser.Scene {
  private slides: TutorialSlide[] = [];
  private currentSlideIndex: number = 0;
  private slideContainer: Phaser.GameObjects.Container | null = null;
  private autoAdvanceTimer: Phaser.Time.TimerEvent | null = null;
  private skipInstructions: Phaser.GameObjects.Text | null = null;
  
  constructor() {
    super('Tutorial');
  }
  
  create(): void {
    console.log('TutorialScene: Creating tutorial...');
    
    // Initialize tutorial slides based on the images provided
    this.initializeSlides();
    
    // Create background
    this.createBackground();
    
    // Setup input handling
    this.setupInput();
    
    // Create skip instructions
    this.createSkipInstructions();
    
    // Show first slide
    this.showSlide(0);
  }
  
  private initializeSlides(): void {
    this.slides = [
      {
        title: 'OH NO!',
        content: [
          'WHILE IN HYPERSPACE, YOUR',
          'SHIP SUDDENLY ENCOUNTERED',
          'A HUGE BELT OF ASTEROIDS!'
        ]
      },
      {
        title: '',
        content: [
          'FORTUNATELY, YOUR JEDI MASTER',
          'ANSHUL TAUGHT YOU HOW TO',
          'CAST SPELLS ON YOUR SHIP TO',
          'DEAL WITH ASTEROIDS.'
        ]
      },
      {
        title: '',
        content: [
          'SOME ASTEROIDS REQUIRE',
          'MULTIPLE SPELLS TO DESTROY.',
          'DESTROY AS MANY ASTEROIDS',
          'AS POSSIBLE TO WIN!'
        ]
      }
    ];
  }
  
  private createBackground(): void {
    // Create space background similar to game scene
    const background = this.add.image(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2,
      'game-background'
    );
    background.setDisplaySize(GAME_SETTINGS.CANVAS_WIDTH, GAME_SETTINGS.CANVAS_HEIGHT);
    background.setDepth(0);
  }
  
  private createSkipInstructions(): void {
    this.skipInstructions = this.add.text(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT - 50,
      'Press ENTER, ESC, or SPACE to continue • Auto-advance in 5s',
      {
        fontSize: '16px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
        align: 'center'
      }
    );
    this.skipInstructions.setOrigin(0.5);
    this.skipInstructions.setAlpha(0.7);
    this.skipInstructions.setDepth(100);
  }
  
  private showSlide(index: number): void {
    // Clear existing slide content
    if (this.slideContainer) {
      this.slideContainer.destroy();
    }
    
    // Clear existing timer
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }
    
    const slide = this.slides[index];
    
    // Create container for slide content - centered on screen
    this.slideContainer = this.add.container(
      GAME_SETTINGS.CANVAS_WIDTH / 2,
      GAME_SETTINGS.CANVAS_HEIGHT / 2
    );
    
    // Add title only for first slide
    if (slide.title) {
      const title = this.add.text(0, -150, slide.title, {
        fontSize: '48px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff',
        align: 'center'
      });
      title.setOrigin(0.5);
      this.slideContainer.add(title);
    }
    
    // Calculate starting Y position for content
    const startY = slide.title ? -50 : -80;
    const lineHeight = 50;
    
    // Add content lines as large white text
    slide.content.forEach((line, lineIndex) => {
      const contentText = this.add.text(
        0, 
        startY + (lineIndex * lineHeight), 
        line, 
        {
          fontSize: '36px',
          fontFamily: '"Press Start 2P", monospace',
          color: '#ffffff',
          align: 'center'
        }
      );
      contentText.setOrigin(0.5);
      if (this.slideContainer) {
        this.slideContainer.add(contentText);
      }
    });
    
    // Add Anshul image on the second slide (index 1) - positioned to the right
    if (index === 1) {
      const anshulImage = this.add.image(350, 200, 'anshul');
      anshulImage.setScale(0.4); // Slightly larger for better visibility
      this.slideContainer.add(anshulImage);
    }
    
    // Add continue arrow if not last slide - positioned at bottom
    if (index < this.slides.length - 1) {
      const arrow = this.add.text(0, 200, '▶', {
        fontSize: '32px',
        fontFamily: '"Press Start 2P", monospace',
        color: '#ffffff'
      });
      arrow.setOrigin(0.5);
      arrow.setAlpha(0.8);
      this.slideContainer.add(arrow);
      
      // Animate arrow
      this.tweens.add({
        targets: arrow,
        alpha: 0.3,
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    }
    
    this.slideContainer.setDepth(50);
    
    // Set up auto-advance timer
    this.autoAdvanceTimer = this.time.delayedCall(5000, () => {
      this.nextSlide();
    });
  }
  
  private setupInput(): void {
    const keys = this.input.keyboard!;
    
    // Enter and Escape to skip slides
    keys.on('keydown-ENTER', () => this.nextSlide());
    keys.on('keydown-ESC', () => this.nextSlide());
    
    // Space bar alternative
    keys.on('keydown-SPACE', () => this.nextSlide());
  }
  
  private nextSlide(): void {
    // Clear auto-advance timer
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }
    
    if (this.currentSlideIndex < this.slides.length - 1) {
      this.currentSlideIndex++;
      this.showSlide(this.currentSlideIndex);
    } else {
      // All slides complete, start the game
      this.startGame();
    }
  }
  
  private startGame(): void {
    console.log('Tutorial complete, starting game...');
    this.scene.start('PlayingGame');
  }
  
  shutdown(): void {
    // Clean up timers
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.destroy();
      this.autoAdvanceTimer = null;
    }
  }
}