# Visualizer API Documentation

## Enums

### Spell
```typescript
export enum Spell {
  NONE = "NONE", // No shape
  NULL = "NULL", // A specific shape
  STAR = "STAR",
  TRIANGLE = "TRIANGLE",
  ARROW = "ARROW"
}
```

## Types

### Point
```typescript
export type Point = { x: number; y: number };
```

## Class: Visualizer

A visualization widget that displays points and current position on a scaled-down rectangular area.

### Constructor

```typescript
constructor(
  scene: Phaser.Scene, 
  x: number, 
  y: number, 
  scale: number = 0.5,
  borderColor: number = 0xFFFFFF,
  borderWidth: number = 2,
  backgroundColor: number = 0x000000
)
```

Creates a new Visualizer widget

**Parameters:**
- `scene` - The Phaser scene to add this widget to
- `x` - The x position of the widget
- `y` - The y position of the widget
- `scale` - The scale factor to apply (e.g., 0.5 for half size)
- `borderColor` - The color of the border
- `borderWidth` - The width of the border
- `backgroundColor` - The background color of the widget

### Public Methods

#### setPoints(points: Point[]): void
Updates the points array and redraws

**Parameters:**
- `points` - Array of points to display (in 640x480 coordinates)

#### setCurrentPosition(position: Point | null): void
Updates the current position and redraws

**Parameters:**
- `position` - Current position (in 640x480 coordinates)

#### showSpell(spell: Spell): void
Overlay a spell visualization

**Parameters:**
- `spell` - The spell to overlay

#### setVisible(visible: boolean): void
Sets the visibility of the visualizer

**Parameters:**
- `visible` - Whether the visualizer should be visible

#### getContainer(): Phaser.GameObjects.Container
Gets the container for this visualizer

**Returns:** The Phaser container object

#### setBorderColor(color: number, borderWidth?: number, backgroundColor?: number): void
Updates the border color of the visualizer

**Parameters:**
- `color` - The new border color as a hex number
- `borderWidth` - The border width (optional, keeps current if not provided)
- `backgroundColor` - The background color (optional, keeps current if not provided)

## Usage Notes

- The visualizer displays points as small yellow dots
- Current position is displayed as a bigger red dot
- All coordinates are expected to be in 640x480 space and are automatically scaled
- The widget has a semi-transparent background with a border
- Spell overlays are drawn with different colors and shapes based on the spell type
- **Spell overlays automatically disappear after 1 second** of being displayed
- **Asteroids now display spell symbols as glyph icons instead of text** in wand mode (preserving original glyph colors)
- **Spells are consumed immediately when detected by game logic** but remain visible in the visualizer for 2 seconds for player feedback
- **Wand mode starts with two symbol types (TRIANGLE and NULL)** and progressively unlocks more symbols over time
- **Game difficulty progression**: Spawn rate decreases from 60 to 45 ticks, fall speed increases from 1.0 to 1.4
- **Maximum asteroid complexity**: 3 symbols maximum (4-symbol asteroids removed for better gameplay balance)
- **Asteroid rarity**: Three-shape asteroids are rarer (20% chance vs 80% for two-shape)
- **Asteroid scaling**: One-shape (0.7x) and two-shape (0.9x) asteroids are bigger for better visibility
- The visualizer is positioned using a container that can be moved and scaled

