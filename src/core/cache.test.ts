import { LRUCache, TranslationCache, getTranslationCache, resetTranslationCache } from './cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>({
      maxSize: 3,
      ttlMs: 1000, // 1초 (테스트용)
    });
  });

  describe('basic operations', () => {
    test('stores and retrieves values', () => {
      // given
      const key = 'test-key';
      const value = 'test-value';

      // when
      cache.set(key, value);
      const result = cache.get(key);

      // then
      expect(result).toBe(value);
    });

    test('returns null for non-existent keys', () => {
      // given
      const key = 'non-existent';

      // when
      const result = cache.get(key);

      // then
      expect(result).toBeNull();
    });

    test('updates existing values', () => {
      // given
      const key = 'test-key';
      const oldValue = 'old-value';
      const newValue = 'new-value';

      // when
      cache.set(key, oldValue);
      cache.set(key, newValue);
      const result = cache.get(key);

      // then
      expect(result).toBe(newValue);
    });
  });

  describe('LRU eviction', () => {
    test('evicts least recently used item when capacity exceeded', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it recently used
      cache.get('key1');

      // when
      cache.set('key4', 'value4'); // Should evict key2 (least recently used)

      // then
      expect(cache.get('key1')).toBe('value1'); // Still exists
      expect(cache.get('key2')).toBeNull(); // Evicted
      expect(cache.get('key3')).toBe('value3'); // Still exists
      expect(cache.get('key4')).toBe('value4'); // Newly added
    });

    test('updates access order on get operations', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // when
      cache.get('key1'); // Make key1 most recently used
      cache.set('key4', 'value4'); // Should evict key2

      // then
      expect(cache.get('key1')).toBe('value1'); // Should still exist
      expect(cache.get('key2')).toBeNull(); // Should be evicted
    });
  });

  describe('TTL expiration', () => {
    test('returns null for expired entries', async () => {
      // given
      const key = 'test-key';
      const value = 'test-value';
      cache.set(key, value);

      // when
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for TTL expiry
      const result = cache.get(key);

      // then
      expect(result).toBeNull();
    });

    test('cleanup removes expired entries', async () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for expiry
      cache.set('key3', 'value3'); // Add fresh entry

      // when
      const cleanedCount = cache.cleanup();

      // then
      expect(cleanedCount).toBe(2); // key1 and key2 should be cleaned
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3'); // Fresh entry should remain
    });
  });

  describe('statistics', () => {
    test('provides accurate cache statistics', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // Access once
      cache.get('key1'); // Access twice

      // when
      const stats = cache.getStats();

      // then
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.validEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalAccessCount).toBe(4); // key1: 1 set + 2 gets = 3, key2: 1 set = 1, total = 4
    });
  });

  describe('utility operations', () => {
    test('clear removes all entries', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // when
      cache.clear();

      // then
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });

    test('delete removes specific key', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // when
      const deleted = cache.delete('key1');

      // then
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    test('keys returns all cache keys', () => {
      // given
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // when
      const keys = cache.keys();

      // then
      expect(keys).toEqual(['key1', 'key2']);
    });
  });
});

describe('TranslationCache', () => {
  let translationCache: TranslationCache;

  beforeEach(() => {
    resetTranslationCache(); // Reset singleton for testing
    translationCache = new TranslationCache();
  });

  test('caches and retrieves translation results', () => {
    // given
    const text = 'Hello world';
    const direction = 'EN_TO_KO';
    const translatedText = '안녕 세상';

    // when
    translationCache.setTranslation(text, direction, translatedText);
    const result = translationCache.getTranslation(text, direction);

    // then
    expect(result).toBe(translatedText);
  });

  test('returns null for non-cached translations', () => {
    // given
    const text = 'Non-cached text';
    const direction = 'EN_TO_KO';

    // when
    const result = translationCache.getTranslation(text, direction);

    // then
    expect(result).toBeNull();
  });

  test('distinguishes between different translation directions', () => {
    // given
    const text = '안녕 세상';
    const enToKo = 'EN_TO_KO';
    const koToEn = 'KO_TO_EN';

    // when
    translationCache.setTranslation(text, koToEn, 'Hello world');
    const koToEnResult = translationCache.getTranslation(text, koToEn);
    const enToKoResult = translationCache.getTranslation(text, enToKo);

    // then
    expect(koToEnResult).toBe('Hello world');
    expect(enToKoResult).toBeNull(); // Different direction should not match
  });

  test('handles long text as cache keys', () => {
    // given
    const longText = 'This is a very long text that could be used as a cache key. '.repeat(50);
    const direction = 'EN_TO_KO';
    const translatedText = '매우 긴 텍스트의 번역 결과';

    // when
    translationCache.setTranslation(longText, direction, translatedText);
    const result = translationCache.getTranslation(longText, direction);

    // then
    expect(result).toBe(translatedText);
  });

  test('clears all cached translations', () => {
    // given
    translationCache.setTranslation('Hello', 'EN_TO_KO', '안녕');
    translationCache.setTranslation('World', 'EN_TO_KO', '세상');

    // when
    translationCache.clear();

    // then
    expect(translationCache.getTranslation('Hello', 'EN_TO_KO')).toBeNull();
    expect(translationCache.getTranslation('World', 'EN_TO_KO')).toBeNull();
  });
});

describe('getTranslationCache singleton', () => {
  beforeEach(() => {
    resetTranslationCache();
  });

  test('returns same instance on multiple calls', () => {
    // given & when
    const cache1 = getTranslationCache();
    const cache2 = getTranslationCache();

    // then
    expect(cache1).toBe(cache2);
  });

  test('maintains state across getInstance calls', () => {
    // given
    const cache1 = getTranslationCache();
    cache1.setTranslation('Test', 'EN_TO_KO', '테스트');

    // when
    const cache2 = getTranslationCache();
    const result = cache2.getTranslation('Test', 'EN_TO_KO');

    // then
    expect(result).toBe('테스트');
  });

  test('creates new instance after reset', () => {
    // given
    const cache1 = getTranslationCache();
    cache1.setTranslation('Test', 'EN_TO_KO', '테스트');

    // when
    resetTranslationCache();
    const cache2 = getTranslationCache();
    const result = cache2.getTranslation('Test', 'EN_TO_KO');

    // then
    expect(cache2).not.toBe(cache1);
    expect(result).toBeNull(); // Cache should be fresh
  });
});