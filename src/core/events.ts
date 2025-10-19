import type { GameEvents } from '../types/global';

type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();
  
  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  once<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const onceCallback = (data: GameEvents[K]) => {
      callback(data);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
  
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
