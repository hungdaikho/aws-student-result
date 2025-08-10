// Cache utility for improving performance
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired items
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const cache = new Cache();

// Clean up expired items every minute
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 60 * 1000);
}

// Cache keys for different types of data
export const CACHE_KEYS = {
  STATISTICS: (year: number, examType: string, sessionType?: string) => 
    `stats:${year}:${examType}:${sessionType || 'null'}`,
  LEADERBOARD: (year: number, examType: string, sessionType?: string) => 
    `leaderboard:${year}:${examType}:${sessionType || 'null'}`,
  WILAYAS: (year: number, examType: string, sessionType?: string) => 
    `wilayas:${year}:${examType}:${sessionType || 'null'}`,
  STUDENT: (matricule: string, year: number, examType: string, sessionType?: string) => 
    `student:${matricule}:${year}:${examType}:${sessionType || 'null'}`,
  RANKING: (matricule: string, year: number, examType: string, sessionType?: string) => 
    `ranking:${matricule}:${year}:${examType}:${sessionType || 'null'}`,
  DATABASE_INFO: 'database:info',
  FILES: 'files:list',
  EXAM_TYPES: 'exam:types'
};

// Cache decorator for functions
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = 5 * 60 * 1000
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator(...args);
    const cached = cache.get<ReturnType<T>>(key);
    
    if (cached) {
      return cached;
    }

    const result = await fn(...args);
    cache.set(key, result, ttl);
    return result;
  }) as T;
}

