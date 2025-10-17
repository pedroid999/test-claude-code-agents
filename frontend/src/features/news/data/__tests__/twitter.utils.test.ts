import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateTwitterUrl,
  validateTwitterHandle,
  getSavedTwitterHandle,
  saveTwitterHandle,
} from '../twitter.utils';
import type { NewsItem } from '../news.schema';

describe('twitter.utils', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  const mockNewsItem: NewsItem = {
    id: '123',
    source: 'Test Source',
    title: 'Test News Title',
    summary: 'This is a test summary',
    link: 'https://example.com/news/123',
    image_url: 'https://example.com/image.jpg',
    status: 'pending',
    category: 'general',
    is_favorite: false,
    user_id: 'user123',
    is_public: true,
    created_at: '2025-01-01T00:00:00Z',
  };

  describe('generateTwitterUrl', () => {
    it('should generate a valid Twitter URL with basic news item', () => {
      const url = generateTwitterUrl(mockNewsItem);

      expect(url).toContain('https://twitter.com/intent/tweet');

      // URLSearchParams encodes spaces as + instead of %20
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('text')).toBe('Test News Title');
      expect(params.get('url')).toBe('https://example.com/news/123');
      expect(params.get('hashtags')).toBe('News');
    });

    it('should include Twitter handle when provided', () => {
      const url = generateTwitterUrl(mockNewsItem, 'testuser');

      expect(url).toContain('via=testuser');
    });

    it('should include Twitter handle when provided with @ symbol', () => {
      const url = generateTwitterUrl(mockNewsItem, '@testuser');

      expect(url).toContain('via=testuser');
    });

    it('should not include via parameter when handle is empty', () => {
      const url = generateTwitterUrl(mockNewsItem, '');

      expect(url).not.toContain('via=');
    });

    it('should truncate long titles to 200 characters', () => {
      const longTitle = 'A'.repeat(250);
      const newsWithLongTitle = { ...mockNewsItem, title: longTitle };
      const url = generateTwitterUrl(newsWithLongTitle);

      const params = new URLSearchParams(url.split('?')[1]);
      const text = params.get('text');

      expect(text).toBeDefined();
      expect(text!.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(text).toContain('...');
    });

    it('should include category-specific hashtags', () => {
      const categories = [
        { category: 'research', expected: 'Research,Science' },
        { category: 'product', expected: 'Product,Tech' },
        { category: 'company', expected: 'Business,Company' },
        { category: 'tutorial', expected: 'Tutorial,Learning' },
        { category: 'opinion', expected: 'Opinion,Perspective' },
      ];

      categories.forEach(({ category, expected }) => {
        const newsItem = { ...mockNewsItem, category: category as any };
        const url = generateTwitterUrl(newsItem);

        const params = new URLSearchParams(url.split('?')[1]);
        expect(params.get('hashtags')).toBe(expected);
      });
    });

    it('should properly encode special characters in title', () => {
      const newsWithSpecialChars = {
        ...mockNewsItem,
        title: 'Test & News: "Breaking" News!',
      };
      const url = generateTwitterUrl(newsWithSpecialChars);

      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('text')).toBe('Test & News: "Breaking" News!');
    });
  });

  describe('validateTwitterHandle', () => {
    it('should validate correct Twitter handles', () => {
      const validHandles = ['testuser', '@testuser', 'test_user', 'user123', 'a'];

      validHandles.forEach((handle) => {
        expect(validateTwitterHandle(handle)).toBe(true);
      });
    });

    it('should allow empty string (optional handle)', () => {
      expect(validateTwitterHandle('')).toBe(true);
    });

    it('should reject handles longer than 15 characters', () => {
      const longHandle = 'a'.repeat(16);
      expect(validateTwitterHandle(longHandle)).toBe(false);
    });

    it('should reject handles with invalid characters', () => {
      const invalidHandles = [
        'test user',    // space
        'test-user',    // hyphen
        'test.user',    // period
        'test@user',    // @ in middle
        'test!user',    // special char
      ];

      invalidHandles.forEach((handle) => {
        expect(validateTwitterHandle(handle)).toBe(false);
      });
    });

    it('should accept handles with @ symbol at start', () => {
      expect(validateTwitterHandle('@validuser')).toBe(true);
    });

    it('should accept handles with underscores', () => {
      expect(validateTwitterHandle('test_user_123')).toBe(true);
    });
  });

  describe('getSavedTwitterHandle', () => {
    it('should return saved handle from localStorage', () => {
      localStorage.setItem('twitter-handle', 'testuser');

      expect(getSavedTwitterHandle()).toBe('testuser');
    });

    it('should return undefined when no handle is saved', () => {
      expect(getSavedTwitterHandle()).toBeUndefined();
    });

    it('should return undefined when handle is empty string', () => {
      localStorage.setItem('twitter-handle', '');

      expect(getSavedTwitterHandle()).toBeUndefined();
    });
  });

  describe('saveTwitterHandle', () => {
    it('should save handle to localStorage', () => {
      saveTwitterHandle('testuser');

      expect(localStorage.getItem('twitter-handle')).toBe('testuser');
    });

    it('should remove @ symbol before saving', () => {
      saveTwitterHandle('@testuser');

      expect(localStorage.getItem('twitter-handle')).toBe('testuser');
    });

    it('should remove handle from localStorage when empty string is provided', () => {
      localStorage.setItem('twitter-handle', 'testuser');
      saveTwitterHandle('');

      expect(localStorage.getItem('twitter-handle')).toBeNull();
    });

    it('should overwrite existing handle', () => {
      saveTwitterHandle('olduser');
      saveTwitterHandle('newuser');

      expect(localStorage.getItem('twitter-handle')).toBe('newuser');
    });
  });
});
