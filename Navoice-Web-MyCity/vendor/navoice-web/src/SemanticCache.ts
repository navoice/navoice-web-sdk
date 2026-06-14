/**
 * In-session cache for semantic resolve results. Key = normalizedText + locale; TTL from spec.
 * Parity with iOS SemanticCache.
 */

export interface SemanticMatch {
  taskId: string;
  confidence: number;
}

interface Entry {
  matches: SemanticMatch[];
  timestamp: number;
}

const DEFAULT_TTL_MS = 120_000;

class SemanticCacheImpl {
  private store: Map<string, Entry> = new Map();
  private defaultTTL = DEFAULT_TTL_MS;

  key(text: string, locale: string): string {
    return `${text}|${locale}`;
  }

  get(key: string, ttlSeconds?: number): SemanticMatch[] | null {
    const ttl = ttlSeconds != null ? ttlSeconds * 1000 : this.defaultTTL;
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.matches;
  }

  set(key: string, matches: SemanticMatch[]): void {
    this.store.set(key, { matches, timestamp: Date.now() });
  }
}

export const SemanticCache = new SemanticCacheImpl();
