/**
 * LRU Cache for Translation Results
 * Sprint 4.3: Cache frequently translated texts to reduce API calls
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

interface CacheConfig {
  maxSize: number;
  ttlMs: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(config: CacheConfig) {
    this.maxSize = config.maxSize;
    this.ttlMs = config.ttlMs;
  }

  /**
   * 캐시에서 값을 조회합니다.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // TTL 검사
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.delete(key);
      return null;
    }

    // 액세스 순서 업데이트 (LRU)
    this.updateAccessOrder(key);
    entry.accessCount++;

    return entry.value;
  }

  /**
   * 캐시에 값을 저장합니다.
   */
  set(key: string, value: T): void {
    const now = Date.now();

    // 기존 엔트리 업데이트
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = now;
      entry.accessCount++;
      this.updateAccessOrder(key);
      return;
    }

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // 새 엔트리 추가
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
    });
    this.accessOrder.push(key);
  }

  /**
   * 캐시에서 키를 삭제합니다.
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }
    return deleted;
  }

  /**
   * 만료된 엔트리들을 정리합니다.
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 캐시 통계를 반환합니다.
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalAccessCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttlMs) {
        expiredEntries++;
      } else {
        validEntries++;
        totalAccessCount += entry.accessCount;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      validEntries,
      expiredEntries,
      totalAccessCount,
      hitRate: totalAccessCount > 0 ? validEntries / totalAccessCount : 0,
    };
  }

  /**
   * 캐시를 완전히 비웁니다.
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 캐시 키 목록을 반환합니다. (디버깅용)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 액세스 순서를 업데이트합니다.
   */
  private updateAccessOrder(key: string): void {
    // 기존 위치에서 제거
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // 맨 뒤에 추가 (가장 최근 사용)
    this.accessOrder.push(key);
  }

  /**
   * 가장 오래 사용되지 않은 엔트리를 제거합니다.
   */
  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
  }
}

/**
 * 번역 캐시 전용 인스턴스
 */
export class TranslationCache {
  private cache: LRUCache<string>;

  constructor() {
    this.cache = new LRUCache<string>({
      maxSize: 5000,
      ttlMs: 24 * 60 * 60 * 1000, // 24시간
    });
  }

  /**
   * 번역 결과를 캐시에서 조회합니다.
   */
  getTranslation(text: string, direction: string): string | null {
    const key = this.createCacheKey(text, direction);
    const result = this.cache.get(key);
    
    if (result) {
      console.log(`💾 Cache HIT: "${text.substring(0, 30)}..." (${direction})`);
    }
    
    return result;
  }

  /**
   * 번역 결과를 캐시에 저장합니다.
   */
  setTranslation(text: string, direction: string, translatedText: string): void {
    const key = this.createCacheKey(text, direction);
    this.cache.set(key, translatedText);
    console.log(`💾 Cache STORE: "${text.substring(0, 30)}..." → "${translatedText.substring(0, 30)}..." (${direction})`);
  }

  /**
   * 만료된 캐시 엔트리를 정리합니다.
   */
  cleanup(): number {
    const cleaned = this.cache.cleanup();
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: ${cleaned} expired entries removed`);
    }
    return cleaned;
  }

  /**
   * 캐시 통계를 반환합니다.
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * 캐시를 완전히 비웁니다.
   */
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Translation cache cleared');
  }

  /**
   * 캐시 키를 생성합니다.
   */
  private createCacheKey(text: string, direction: string): string {
    // 텍스트와 방향을 조합하여 고유한 키 생성
    // 텍스트가 길어도 전체를 키로 사용 (정확한 매칭을 위해)
    return `${direction}:${text}`;
  }
}

// 전역 번역 캐시 인스턴스
let translationCacheInstance: TranslationCache | null = null;

/**
 * 싱글톤 번역 캐시 인스턴스를 반환합니다.
 */
export function getTranslationCache(): TranslationCache {
  if (!translationCacheInstance) {
    translationCacheInstance = new TranslationCache();
    console.log('💾 Translation cache initialized (size: 5000, TTL: 24h)');
  }
  return translationCacheInstance;
}

/**
 * 캐시 인스턴스를 재설정합니다. (테스트용)
 */
export function resetTranslationCache(): void {
  translationCacheInstance = null;
}