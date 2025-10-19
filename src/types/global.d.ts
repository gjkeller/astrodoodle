// Global type definitions for Rocket Racer

export type PlayerId = 0 | 1;
export type PlayerSide = 'left' | 'right' | 'center';
export type PlayerReadyState = 'ready' | 'not-ready';
export type SymbolKind = 'V' | 'II' | 'dash' | 'star';

export interface Player {
  ready: PlayerReadyState;
  score: number;
  mult: number; // 1-5
  progress: number; // 0-1
  consecutiveAsteroids: number; // Count of consecutive asteroids destroyed
}

export interface GameStore {
  players: [Player, Player];
  goal: number;
  resetForNewGame(): void;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface GameEvents {
  'player:ready': { playerId: PlayerId; ready: PlayerReadyState };
  'hud:score': { playerId: PlayerId; score: number };
  'hud:mult': { playerId: PlayerId; mult: number };
  'progress:set': { playerId: PlayerId; progress: number };
  'game:win': { winner: PlayerId };
  'hud:stroke': { playerId: PlayerId; points: StrokePoint[] };
  'symbol:submit': { playerId: PlayerId; symbol: SymbolKind };
}

// Extend Phaser namespace for our custom types
declare namespace Phaser {
  interface Game {
    events: import('./core/events').EventBus;
  }
}
