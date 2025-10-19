import type { StrokePoint, SymbolKind } from '../types/global';

// Placeholder types for future MediaPipe integration
export interface GestureData {
  points: StrokePoint[];
  symbol: SymbolKind | null;
  confidence: number;
}

export interface GestureFeed {
  onGesture: (callback: (data: GestureData) => void) => void;
  start(): void;
  stop(): void;
}

// Placeholder implementation for demo purposes
export class PlaceholderGestureFeed implements GestureFeed {
  private callbacks: ((data: GestureData) => void)[] = [];
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  
  onGesture(callback: (data: GestureData) => void): void {
    this.callbacks.push(callback);
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Generate fake gesture data every 2 seconds for demo
    this.intervalId = window.setInterval(() => {
      const fakeData: GestureData = {
        points: this.generateFakeStroke(),
        symbol: this.getRandomSymbol(),
        confidence: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
      };
      
      this.callbacks.forEach(callback => callback(fakeData));
    }, 2000);
  }
  
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private generateFakeStroke(): StrokePoint[] {
    const points: StrokePoint[] = [];
    const numPoints = Math.floor(Math.random() * 10) + 5; // 5-14 points
    
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: Math.random(),
        y: Math.random()
      });
    }
    
    return points;
  }
  
  private getRandomSymbol(): SymbolKind {
    const symbols: SymbolKind[] = ['V', 'II', 'dash', 'star'];
    return symbols[Math.floor(Math.random() * symbols.length)];
  }
}

// Export singleton instance
export const gestureFeed = new PlaceholderGestureFeed();
