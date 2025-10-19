import type { SymbolKind } from '../types/global';

export class SymbolMatcher {
  static match(submitted: SymbolKind, requirement: SymbolKind): boolean {
    return submitted === requirement;
  }
  
  static getSymbolDisplay(symbol: SymbolKind): string {
    switch (symbol) {
      case 'V':
        return 'V';
      case 'II':
        return 'II';
      case 'dash':
        return '—';
      case 'star':
        return '★';
      default:
        return '?';
    }
  }
  
  static getAllSymbols(): SymbolKind[] {
    return ['V', 'II', 'dash', 'star'];
  }
  
  static getRandomSymbol(): SymbolKind {
    const symbols = this.getAllSymbols();
    return symbols[Math.floor(Math.random() * symbols.length)];
  }
}
