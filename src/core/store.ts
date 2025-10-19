import type { Player, GameStore, PlayerId } from '../types/global';
import { GAME_SETTINGS } from './settings';

class GameStoreImpl implements GameStore {
  public players: [Player, Player] = [
    {
      ready: 'not-ready',
      score: 0,
      mult: 1,
      progress: 0,
      consecutiveAsteroids: 0,
    },
    {
      ready: 'not-ready',
      score: 0,
      mult: 1,
      progress: 0,
      consecutiveAsteroids: 0,
    },
  ];
  
  public goal: number = GAME_SETTINGS.GOAL;
  
  constructor() {
    this.resetForNewGame();
  }
  
  resetForNewGame(): void {
    this.players[0] = {
      ready: 'not-ready',
      score: 0,
      mult: 1,
      progress: 0,
      consecutiveAsteroids: 0,
    };
    this.players[1] = {
      ready: 'not-ready',
      score: 0,
      mult: 1,
      progress: 0,
      consecutiveAsteroids: 0,
    };
  }
  
  setPlayerReady(playerId: PlayerId, ready: 'ready' | 'not-ready'): void {
    this.players[playerId].ready = ready;
  }
  
  updateScore(playerId: PlayerId, delta: number): void {
    this.players[playerId].score += delta;
  }
  
  updateMultiplier(playerId: PlayerId, delta: number): void {
    const current = this.players[playerId].mult;
    const newMult = Math.max(
      GAME_SETTINGS.MIN_MULTIPLIER,
      Math.min(GAME_SETTINGS.MAX_MULTIPLIER, current + delta)
    );
    this.players[playerId].mult = newMult;
  }
  
  onAsteroidDestroyed(playerId: PlayerId): void {
    // Increment consecutive asteroids
    this.players[playerId].consecutiveAsteroids++;
    
    // Update multiplier based on consecutive asteroids
    // 1: 0 asteroids, 2: 3 asteroids, 3: 10 asteroids, 4: 20 asteroids, 5: 30 asteroids
    let newMultiplier = 1;
    if (this.players[playerId].consecutiveAsteroids >= 30) {
      newMultiplier = 5;
    } else if (this.players[playerId].consecutiveAsteroids >= 20) {
      newMultiplier = 4;
    } else if (this.players[playerId].consecutiveAsteroids >= 10) {
      newMultiplier = 3;
    } else if (this.players[playerId].consecutiveAsteroids >= 3) {
      newMultiplier = 2;
    }
    
    this.players[playerId].mult = newMultiplier;
  }
  
  onAsteroidHit(playerId: PlayerId): void {
    // Reset consecutive asteroids and multiplier to 1
    this.players[playerId].consecutiveAsteroids = 0;
    this.players[playerId].mult = 1;
  }
  
  updateProgress(playerId: PlayerId, delta: number): void {
    const current = this.players[playerId].progress;
    this.players[playerId].progress = Math.min(1, current + delta);
  }
  
  checkWinCondition(): PlayerId | null {
    if (this.players[0].progress >= 1) return 0;
    if (this.players[1].progress >= 1) return 1;
    return null;
  }
  
  areBothPlayersReady(): boolean {
    return this.players[0].ready === 'ready' && this.players[1].ready === 'ready';
  }
}

// Singleton instance
export const gameStore = new GameStoreImpl();
