export type InputMode = 'keyboard' | 'wand';
export type PlayerCount = 1 | 2;

class SettingsStoreImpl {
  private inputMode: InputMode = 'keyboard';
  private playerCount: PlayerCount = 1;
  
  getInputMode(): InputMode {
    return this.inputMode;
  }
  
  setInputMode(mode: InputMode): void {
    this.inputMode = mode;
  }
  
  getPlayerCount(): PlayerCount {
    return this.playerCount;
  }
}

// Singleton instance
export const settingsStore = new SettingsStoreImpl();

