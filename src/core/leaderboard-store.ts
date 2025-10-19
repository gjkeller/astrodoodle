import type { LeaderboardEntry, LeaderboardStore } from '../types/global';
import { eventBus } from './events';

class LeaderboardStoreImpl implements LeaderboardStore {
  public entries: LeaderboardEntry[] = [];
  private readonly STORAGE_KEY = 'rocket-racer-leaderboard';
  private readonly MAX_ENTRIES = 50; // Keep top 50 scores
  private readonly MAX_NAME_LENGTH = 13;
  private readonly MAX_SCORE = 99999;

  constructor() {
    this.loadFromStorage();
  }

  addScore(name: string, score: number): void {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }
    
    if (score < 0 || score > this.MAX_SCORE) {
      throw new Error(`Score must be between 0 and ${this.MAX_SCORE}`);
    }

    // Sanitize and truncate name
    const sanitizedName = this.sanitizeName(name);
    
    // Remove existing entry with same name (case-insensitive)
    this.entries = this.entries.filter(entry => 
      entry.name.toLowerCase() !== sanitizedName.toLowerCase()
    );

    // Create new entry
    const newEntry: LeaderboardEntry = {
      name: sanitizedName,
      score: Math.floor(score),
      timestamp: Date.now()
    };

    // Add to entries
    this.entries.push(newEntry);

    // Sort by score (highest first), then by timestamp (oldest first for ties)
    this.entries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.timestamp - b.timestamp;
    });

    // Keep only top entries
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(0, this.MAX_ENTRIES);
    }

    // Save to storage
    this.saveToStorage();

    // Emit event
    eventBus.emit('leaderboard:score-added', { entry: newEntry });
  }

  getTopScores(limit: number = 10): LeaderboardEntry[] {
    return this.entries.slice(0, limit);
  }

  clearScores(): void {
    this.entries = [];
    this.saveToStorage();
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Validate stored data
          this.entries = parsed.filter(entry => 
            entry && 
            typeof entry.name === 'string' && 
            typeof entry.score === 'number' &&
            typeof entry.timestamp === 'number' &&
            entry.name.length <= this.MAX_NAME_LENGTH &&
            entry.score >= 0 && entry.score <= this.MAX_SCORE
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load leaderboard from storage:', error);
      this.entries = [];
    }
  }

  saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.warn('Failed to save leaderboard to storage:', error);
    }
  }

  private sanitizeName(name: string): string {
    // Remove any non-printable characters and limit length
    return name
      .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII characters
      .trim()
      .substring(0, this.MAX_NAME_LENGTH);
  }

  // Helper method to check if a score qualifies for the leaderboard
  isHighScore(score: number): boolean {
    if (this.entries.length < this.MAX_ENTRIES) {
      return true; // Always qualify if we have space
    }
    
    const lowestScore = this.entries[this.entries.length - 1]?.score || 0;
    return score > lowestScore;
  }

  // Helper method to get rank of a score
  getScoreRank(score: number): number {
    return this.entries.findIndex(entry => entry.score < score) + 1;
  }
}

// Singleton instance
export const leaderboardStore = new LeaderboardStoreImpl();
