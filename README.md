# AstroDoodle

A Phaser 3 TypeScript vertical split-screen two-player racing game prototype.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Game Overview

AstroDoodle is a gesture-based racing game where two players compete by drawing symbols to match asteroid requirements. The game features:

- **Split-screen gameplay** - Each player has their own side of the screen
- **Gesture recognition** - Players draw symbols to match asteroid requirements
- **Progress racing** - First player to reach the goal wins
- **Multiplier system** - Correct matches increase score multiplier
- **HUD elements** - Score, multiplier stars, and gesture minimap

## Assets Checklist

Before running the game, you need to add these files to `/src/assets/`:

### Required Assets
- `bg_stars.png` - Starry background image
- `divider.png` - Vertical center divider bar
- `glyph_orange.png` - Player 1 ship/glyph (orange)
- `glyph_purple.png` - Player 2 ship/glyph (purple)
- `press2p.png` - Press Start 2P bitmap font atlas
- `press2p.fnt` - Font descriptor file (provided)
- `asteroid.png` - Asteroid sprite
- `icon_star.png` - Star icon for multiplier

### Optional Assets
- `fx_nitro.wav` - Nitro boost sound
- `fx_hit.wav` - Hit/correct match sound
- `fx_miss.wav` - Miss/incorrect match sound

**Note**: If any required assets are missing, the game will display a blocking overlay with instructions.

## Keyboard Controls (Demo Mode)

### Player 1 (Left Side)
- **WASD** - Draw gesture strokes (W=up, A=left, S=down, D=right)
- **Q/E** - Lane change gestures (left/right)
- **Space** - Submit current symbol (cycles through V → II → — → ★)

### Player 2 (Right Side)
- **Arrow Keys** - Draw gesture strokes (↑=up, ←=left, ↓=down, →=right)
- **O/P** - Lane change gestures (left/right)
- **Enter** - Submit current symbol (cycles through V → II → — → ★)

### General
- **Enter** (in Select Players) - Toggle both players ready for quick demo

## Game Flow

1. **Menu Scene** - Title screen with PLAY, LEADERBOARD, SETTINGS buttons
2. **Select Players** - Ready up both players, START button enabled when both ready
3. **Playing Game** - Main gameplay with HUD, progress bar, and asteroid matching
4. **Leaderboard** - Coming soon (stub)

## Gameplay Mechanics

### Symbol Matching
- Asteroids display requirement symbols: V, II, —, ★
- Players submit symbols by pressing Space (P1) or Enter (P2)
- Correct matches: +10 points × multiplier, multiplier +1 (max 4), progress +2%
- Incorrect matches: multiplier resets to 1, flash red

### Win Condition
- First player to reach 100% progress wins
- Game returns to menu after 3-second win display

## Technical Architecture

### Core Modules
- `store.ts` - Game state management (scores, progress, ready flags)
- `events.ts` - Typed event bus for scene communication
- `settings.ts` - Game constants and configuration
- `input.ts` - Keyboard input simulation for gestures

### UI Components
- `button.ts` - Pixel-style button with hover/disabled states
- `hud.ts` - Player HUD with score, multiplier, and minimap
- `minimap.ts` - Gesture stroke visualization
- `progressBar.ts` - Center dual progress bar with player markers
- `bitmapText.ts` - Press Start 2P font helper

### Gameplay
- `asteroid.ts` - Asteroid prefab with requirement labels
- `matcher.ts` - Symbol matching logic

### Scenes
- `BootScene` - Asset validation and loading
- `MenuScene` - Main menu with navigation
- `SelectPlayersScene` - Player ready state management
- `PlayingGameScene` - Main gameplay loop
- `LeaderboardScene` - Coming soon stub

## Next Steps

### MediaPipe Integration
The game is designed to integrate with MediaPipe for real gesture recognition:

1. **Replace placeholder** in `vision/gestures.ts`
2. **Implement hand tracking** using MediaPipe Hands
3. **Add stroke segmentation** to detect drawing gestures
4. **Train symbol classifier** to recognize V, II, —, ★ symbols
5. **Wire gesture feed** to replace keyboard simulation

### Asteroid Spawning System
Currently asteroids are placed statically. Future implementation should include:

1. **Spawn manager** in `gameplay/spawner.ts`
2. **Movement patterns** for asteroids
3. **Difficulty scaling** based on progress
4. **Power-ups and special asteroids**

### Audio System
Add sound effects and background music:

1. **Audio manager** for sound effects
2. **Background music** with dynamic mixing
3. **Spatial audio** for left/right player feedback

### Multiplayer
Extend to support online multiplayer:

1. **WebSocket integration** for real-time sync
2. **Room system** for matchmaking
3. **Spectator mode** for watching games

## Development Notes

- Built with **Phaser 3.80.1** and **TypeScript**
- Uses **Vite** for fast development and building
- **Strict TypeScript** configuration for type safety
- **ESLint + Prettier** for code quality
- **Barrel exports** for clean imports
- **Event-driven architecture** for loose coupling

## File Structure

```
src/
├── assets/           # Game assets (images, audio, fonts)
├── core/            # Core game systems
├── ui/              # UI components
├── gameplay/        # Game logic and objects
├── scenes/          # Phaser scenes
├── vision/          # Gesture recognition (placeholder)
├── types/           # TypeScript type definitions
└── main.ts          # Game entry point
```

## License

MIT License - feel free to use this code for your own projects!