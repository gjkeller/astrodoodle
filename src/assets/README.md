# Assets Required for Rocket Racer

This directory should contain the following image files for the game to work properly:

## Required Assets

### Background & UI
- `bg_stars.png` - Starry background image (1280x720 recommended)
- `bg.png` - Main background image for scenes
- `bg-blurred.png` - Blurred background image for overlays/menus
- `divider.png` - Vertical center divider bar (rounded pill shape, any height)

### Player Glyphs
- `glyph_orange.png` - Player 1 ship/glyph (orange colored)
- `glyph_purple.png` - Player 2 ship/glyph (purple colored)

### Bitmap Font
- `press2p.png` - Press Start 2P bitmap font atlas (256x256 recommended)
- `press2p.fnt` - Font descriptor file (already provided)

### Game Objects
- `asteroid.png` - Asteroid sprite (any size, will be scaled)
- `icon_star.png` - Star icon for multiplier display

## Optional Assets

### Audio (place in this directory)
- `fx_nitro.wav` - Nitro boost sound effect
- `fx_hit.wav` - Hit/correct match sound
- `fx_miss.wav` - Miss/incorrect match sound

## Getting the Press Start 2P Font

You can get the Press Start 2P bitmap font from:
1. [Google Fonts](https://fonts.google.com/specimen/Press+Start+2P) - Download the TTF
2. Use a tool like [BMFont](http://www.angelcode.com/products/bmfont/) to convert to bitmap font
3. Or use an online bitmap font generator

The font should be 16px size and include all ASCII characters (32-126).

## Asset Guidelines

- All images should be PNG format with transparency where needed
- Background should be 1280x720 or will be scaled to fit
- Player glyphs should be roughly 64x64 pixels
- Asteroid can be any size (will be scaled to 0.5x)
- Star icon should be small (16x16 to 32x32)

## Missing Assets

If any required assets are missing, the game will display a blocking overlay with the list of missing files and instructions to add them to this directory.
