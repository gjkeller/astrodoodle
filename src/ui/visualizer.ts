// Enum for spell types
export enum Spell {
  NONE = "NONE", // No shape
  NULL = "NULL", // A specific shape
  STAR = "STAR",
  TRIANGLE = "TRIANGLE",
  ARROW = "ARROW"
}

// Type definition for a point
export type Point = { x: number; y: number };

/**
 * A visualization widget that displays points and current position on a scaled-down rectangular area
 */
export class Visualizer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  
  // Original dimensions
  private readonly originalWidth = 640;
  private readonly originalHeight = 480;
  
  // Actual dimensions after scaling
  private width: number;
  private height: number;
  private scale: number;
  
  // Graphics objects
  private border: Phaser.GameObjects.Graphics;
  private pointsGraphics: Phaser.GameObjects.Graphics;
  private currentPosGraphics: Phaser.GameObjects.Graphics;
  private spellGraphics: Phaser.GameObjects.Image | null = null;
  
  // Data
  private points: Point[] = [];
  private currentPos: Point | null = null;

  /**
   * Creates a new Visualizer widget
   * 
   * @param scene The Phaser scene to add this widget to
   * @param x The x position of the widget
   * @param y The y position of the widget
   * @param scale The scale factor to apply (e.g., 0.5 for half size)
   * @param borderColor The color of the border
   * @param borderWidth The width of the border
   * @param backgroundColor The background color of the widget
   */
  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    scale: number = 0.5,
    borderColor: number = 0xFFFFFF,
    borderWidth: number = 2,
    backgroundColor: number = 0x000000
  ) {
    this.scene = scene;
    this.scale = scale;
    this.width = this.originalWidth * scale;
    this.height = this.originalHeight * scale;
    
    // Create container for all elements
    this.container = scene.add.container(x, y);
    
    // Create background and border
    this.border = scene.add.graphics();
    this.border.fillStyle(backgroundColor, 0.3);
    this.border.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    this.border.lineStyle(borderWidth, borderColor, 1);
    this.border.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    
    // Create graphics for points and current position
    this.pointsGraphics = scene.add.graphics();
    this.currentPosGraphics = scene.add.graphics();
    
    // Add all graphics to container
    this.container.add([this.border, this.pointsGraphics, this.currentPosGraphics]);
    this.container.setDepth(10);
  }

  /**
   * Updates the points array and redraws
   * 
   * @param points Array of points to display (in 640x480 coordinates)
   */
  setPoints(points: Point[]): void {
    this.points = points;
    this.redraw();
  }

  /**
   * Updates the current position and redraws
   * 
   * @param position Current position (in 640x480 coordinates)
   */
  setCurrentPosition(position: Point | null): void {
    this.currentPos = position;
    this.redraw();
  }

  /**
   * Overlay a spell visualization
   * 
   * @param spell The spell to overlay
   */
  showSpell(spell: Spell): void {
    
    // Remove existing spell graphic if any
    if (this.spellGraphics) {
      this.spellGraphics.destroy();
      this.spellGraphics = null;
    }
    
    if (spell === Spell.NONE) {
      return; // No shape to draw
    }
    
    // Create spell sprite using uploaded glyph assets
    this.createSpellSprite(spell);
  }

  /**
   * Create a spell sprite using uploaded glyph assets
   */
  private createSpellSprite(spell: Spell): void {
    // Map spell enum to glyph asset key
    const glyphMapping: Record<Spell, string> = {
      [Spell.NULL]: 'glyph-null',
      [Spell.STAR]: 'glyph-star',
      [Spell.TRIANGLE]: 'glyph-triangle',
      [Spell.ARROW]: 'glyph-arrow',
      [Spell.NONE]: ''
    };
    
    const glyphKey = glyphMapping[spell];
    if (!glyphKey) return;
    
    // Create sprite at center of visualizer
    this.spellGraphics = this.scene.add.image(0, 0, glyphKey);
    this.spellGraphics.setScale(this.scale * 2.0); // Significantly larger
    this.spellGraphics.setAlpha(0.9); // Slightly transparent
    // Remove tint to preserve original glyph colors
    
    // Add to container
    this.container.add(this.spellGraphics);
  }

  /**
   * Redraws all visual elements
   */
  private redraw(): void {
    // Clear existing graphics
    this.pointsGraphics.clear();
    this.currentPosGraphics.clear();
    
    // Draw points as a super smooth curve
    if (this.points.length > 1) {
      this.pointsGraphics.lineStyle(4, 0xFFFF00, 1); // Thicker yellow line for better visibility
      
      // Convert points to scaled coordinates
      const scaledPoints = this.points.map(point => ({
        x: point.x * this.scale - this.width / 2,
        y: point.y * this.scale - this.height / 2
      }));
      
      // Create multiple spline paths with high resolution for ultra-smooth curves
      const vectors = scaledPoints.map(p => new Phaser.Math.Vector2(p.x, p.y));
      
      if (vectors.length >= 3) {
        // Use spline with maximum smoothness
        const path = new Phaser.Curves.Spline(vectors);
        
        // Draw the ultra-smooth curve with maximum resolution
        this.pointsGraphics.beginPath();
        path.draw(this.pointsGraphics, 256); // 256 divisions for ultra-smooth curve
        this.pointsGraphics.strokePath();
      } else {
        // For just 2 points, create a simple smooth line with rounded caps
        this.pointsGraphics.beginPath();
        this.pointsGraphics.moveTo(scaledPoints[0].x, scaledPoints[0].y);
        
        // Add slight curve even for 2 points
        const midX = (scaledPoints[0].x + scaledPoints[1].x) / 2;
        const midY = (scaledPoints[0].y + scaledPoints[1].y) / 2;
        
        // Create a very subtle arc
        const controlX = midX + (scaledPoints[1].y - scaledPoints[0].y) * 0.1;
        const controlY = midY - (scaledPoints[1].x - scaledPoints[0].x) * 0.1;
        
        // Use a quadratic curve for slight smoothness
        const path = new Phaser.Curves.QuadraticBezier(
          new Phaser.Math.Vector2(scaledPoints[0].x, scaledPoints[0].y),
          new Phaser.Math.Vector2(controlX, controlY),
          new Phaser.Math.Vector2(scaledPoints[1].x, scaledPoints[1].y)
        );
        
        path.draw(this.pointsGraphics, 64);
        this.pointsGraphics.strokePath();
      }
    } else if (this.points.length === 1) {
      // Draw a single point as a small circle if there's only one point
      const point = this.points[0];
      const scaledX = point.x * this.scale - this.width / 2;
      const scaledY = point.y * this.scale - this.height / 2;
      this.pointsGraphics.fillStyle(0xFFFF00, 1);
      this.pointsGraphics.fillCircle(scaledX, scaledY, 3);
    }
    
    // Draw current position as a bigger red dot
    if (this.currentPos) {
      const scaledX = this.currentPos.x * this.scale - this.width / 2;
      const scaledY = this.currentPos.y * this.scale - this.height / 2;
      this.currentPosGraphics.fillStyle(0xFF0000, 1);
      this.currentPosGraphics.fillCircle(scaledX, scaledY, 8);
    }
  }


  /**
   * Sets the visibility of the visualizer
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /**
   * Gets the container for this visualizer
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Updates the border color of the visualizer
   * @param color The new border color as a hex number
   * @param borderWidth The border width (optional, keeps current if not provided)
   * @param backgroundColor The background color (optional, keeps current if not provided)
   */
  setBorderColor(color: number, borderWidth?: number, backgroundColor?: number): void {
    // Clear and redraw the border with new color
    this.border.clear();
    
    // Use current background color if not provided
    const bgColor = backgroundColor !== undefined ? backgroundColor : 0x000000;
    const bWidth = borderWidth !== undefined ? borderWidth : 2;
    
    this.border.fillStyle(bgColor, 0.3);
    this.border.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    this.border.lineStyle(bWidth, color, 1);
    this.border.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
  }
}