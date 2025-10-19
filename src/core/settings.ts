// Game constants and settings

export const GAME_SETTINGS = {
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  
  // Game progression
  GOAL: 100,
  
  // Player positions (normalized)
  LEFT_PLAYER_X: 0.25,
  RIGHT_PLAYER_X: 0.75,
  
  // UI dimensions
  MINIMAP_WIDTH: 160,
  MINIMAP_HEIGHT: 100,
  
  // Scoring
  BASE_SCORE: 10,
  MAX_MULTIPLIER: 4,
  MIN_MULTIPLIER: 1,
  PROGRESS_INCREMENT: 0.02, // 2% of goal per correct match
  
  // Colors
  COLORS: {
    ORANGE: 0xff8800,
    PURPLE: 0x8800ff,
    BLUE: 0x0088ff,
    GREY: 0x666666,
    WHITE: 0xffffff,
    BLACK: 0x000000,
    RED: 0xff0000,
    GREEN: 0x00ff00,
    YELLOW: 0xffff00,
  },
  
  // Asset paths
  ASSETS_PATH: '/src/assets/',
  
  // Required assets
  REQUIRED_ASSETS: [
    'background.png',
    'background-blurred.png',
    'divider.png',
    'glyph_orange.png',
    'glyph_purple.png',
    'PressStart2P-Regular.ttf',
    'asteroid.png',
    'icon_star.png',
  ],
  
  // Optional assets
  OPTIONAL_ASSETS: [
    'fx_nitro.wav',
    'fx_hit.wav',
    'fx_miss.wav',
  ],
} as const;

// Helper function to clamp values
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Helper function to normalize coordinates
export function normalizeX(x: number): number {
  return x / GAME_SETTINGS.CANVAS_WIDTH;
}

export function normalizeY(y: number): number {
  return y / GAME_SETTINGS.CANVAS_HEIGHT;
}
