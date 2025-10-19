import { Spell } from '../ui/visualizer';
import type { InputMode } from './settings-store';
import { visualizerManager } from './visualizer-manager';

export interface ModeInput {
  getCurrentSpell(): Spell;
  isWandPresent?(): boolean;
}

class KeyboardModeInput implements ModeInput {
  getCurrentSpell(): Spell { 
    return Spell.NONE; 
  }
}

class WandModeInput implements ModeInput {
  getCurrentSpell(): Spell {
    return visualizerManager.getCurrentSpell();
  }
  
  isWandPresent(): boolean {
    return visualizerManager.isWandPresent();
  }
}

export function createModeInput(mode: InputMode, _scene: Phaser.Scene): ModeInput {
  return mode === 'wand' ? new WandModeInput() : new KeyboardModeInput();
}
