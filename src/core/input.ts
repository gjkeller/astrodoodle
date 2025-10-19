import type { PlayerId, StrokePoint, SymbolKind } from '../types/global';
import { eventBus } from './events';
import { gameStore } from './store';

export class InputManager {
  private scene: Phaser.Scene;
  private strokePoints: Map<PlayerId, StrokePoint[]> = new Map();
  private currentSymbol: Map<PlayerId, SymbolKind> = new Map();
  private symbolCycle: SymbolKind[] = ['V', 'II', 'dash', 'star'];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.strokePoints.set(0, []);
    this.strokePoints.set(1, []);
    this.currentSymbol.set(0, 'V');
    this.currentSymbol.set(1, 'V');
    
    this.setupKeyboardInput();
  }
  
  private setupKeyboardInput(): void {
    const keys = this.scene.input.keyboard!;
    
    // Player 1 controls (WASD + Q/E for lane changes, Space for symbol submit)
    keys.on('keydown-W', () => this.addStrokePoint(0, { x: 0.5, y: 0.3 }));
    keys.on('keydown-A', () => this.addStrokePoint(0, { x: 0.2, y: 0.5 }));
    keys.on('keydown-S', () => this.addStrokePoint(0, { x: 0.5, y: 0.7 }));
    keys.on('keydown-D', () => this.addStrokePoint(0, { x: 0.8, y: 0.5 }));
    
    keys.on('keydown-Q', () => this.addStrokePoint(0, { x: 0.1, y: 0.4 }));
    keys.on('keydown-E', () => this.addStrokePoint(0, { x: 0.9, y: 0.4 }));
    
    keys.on('keydown-SPACE', () => this.submitSymbol(0));
    
    // Player 2 controls (Arrow keys + O/P for lane changes, Enter for symbol submit)
    keys.on('keydown-UP', () => this.addStrokePoint(1, { x: 0.5, y: 0.3 }));
    keys.on('keydown-LEFT', () => this.addStrokePoint(1, { x: 0.2, y: 0.5 }));
    keys.on('keydown-DOWN', () => this.addStrokePoint(1, { x: 0.5, y: 0.7 }));
    keys.on('keydown-RIGHT', () => this.addStrokePoint(1, { x: 0.8, y: 0.5 }));
    
    keys.on('keydown-O', () => this.addStrokePoint(1, { x: 0.1, y: 0.4 }));
    keys.on('keydown-P', () => this.addStrokePoint(1, { x: 0.9, y: 0.4 }));
    
    keys.on('keydown-ENTER', () => {
      if (this.scene.scene.key === 'SelectPlayers') {
        this.toggleBothPlayersReady();
      } else {
        this.submitSymbol(1);
      }
    });
  }
  
  private addStrokePoint(playerId: PlayerId, point: StrokePoint): void {
    const points = this.strokePoints.get(playerId)!;
    points.push(point);
    
    // Keep only last 20 points for performance
    if (points.length > 20) {
      points.shift();
    }
    
    // Emit event for minimap update
    eventBus.emit('hud:stroke', { playerId, points: [...points] });
  }
  
  private submitSymbol(playerId: PlayerId): void {
    const symbol = this.currentSymbol.get(playerId)!;
    
    // Emit symbol submission event
    eventBus.emit('symbol:submit', { playerId, symbol });
    
    // Cycle to next symbol
    const currentIndex = this.symbolCycle.indexOf(symbol);
    const nextIndex = (currentIndex + 1) % this.symbolCycle.length;
    this.currentSymbol.set(playerId, this.symbolCycle[nextIndex]);
  }
  
  private toggleBothPlayersReady(): void {
    const currentState = gameStore.players[0].ready;
    const newState = currentState === 'ready' ? 'not-ready' : 'ready';
    
    gameStore.setPlayerReady(0, newState);
    gameStore.setPlayerReady(1, newState);
    
    eventBus.emit('player:ready', { playerId: 0, ready: newState });
    eventBus.emit('player:ready', { playerId: 1, ready: newState });
  }
  
  getStrokePoints(playerId: PlayerId): StrokePoint[] {
    return this.strokePoints.get(playerId) || [];
  }
  
  getCurrentSymbol(playerId: PlayerId): SymbolKind {
    return this.currentSymbol.get(playerId) || 'V';
  }
  
  clearStrokePoints(playerId: PlayerId): void {
    this.strokePoints.set(playerId, []);
  }
}
