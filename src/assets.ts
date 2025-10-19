// Import all game assets using ES imports for Vite HMR support
import background from './assets/background.png';
import backgroundBlurred from './assets/background-blurred.png';
import gameBackground from './assets/game-background.png';
import gameBackgroundXl from './assets/game-background-xl.png';
import buttonBg from './assets/button_bg.png';
import buttonGray from './assets/button-gray.png';
import cursor from './assets/cursor.png';
import orangeShip from './assets/orange-ship.png';
import purpleShip from './assets/purple-ship.png';
import meteor1 from './assets/meteor1.png';
import explosion from './assets/explosion.png';
import missile from './assets/missile.png';

// Character images
import anshulImage from '../public/assets/anshul.png';

// Glyph sprites for wand mode
import nullGlyph from './assets/null.png';
import starGlyph from './assets/star.png';
import triangleGlyph from './assets/triangle.png';
import arrowGlyph from './assets/right-arrow.png';

// Progress bar assets
import barGrayRoundOutlineSmallL from './assets/bar_gray_round_outline_small_l.png';
import barGrayRoundOutlineSmallM from './assets/bar_gray_round_outline_small_m.png';
import barGrayRoundOutlineSmallR from './assets/bar_gray_round_outline_small_r.png';
import barRoundLargeL from './assets/bar_round_large_l.png';
import barRoundLargeM from './assets/bar_round_large_m.png';
import barRoundLargeR from './assets/bar_round_large_r.png';

export const ASSETS = {
  background,
  backgroundBlurred,
  gameBackground,
  gameBackgroundXl,
  buttonBg,
  buttonGray,
  cursor,
  orangeShip,
  purpleShip,
  meteor1,
  explosion,
  missile,
  // Character images
  anshulImage,
  // Glyph sprites
  nullGlyph,
  starGlyph,
  triangleGlyph,
  arrowGlyph,
  // Progress bar assets
  barGrayRoundOutlineSmallL,
  barGrayRoundOutlineSmallM,
  barGrayRoundOutlineSmallR,
  barRoundLargeL,
  barRoundLargeM,
  barRoundLargeR,
} as const;
