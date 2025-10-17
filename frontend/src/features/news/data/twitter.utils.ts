import type { NewsItem, NewsCategory } from './news.schema';

/**
 * Generates a Twitter share URL for a news item
 * @param newsItem - The news item to share
 * @param twitterHandle - Optional Twitter handle to be mentioned (without @)
 * @returns Twitter intent URL
 */
export const generateTwitterUrl = (
  newsItem: NewsItem,
  twitterHandle?: string
): string => {
  // Validate that news item has a valid link
  if (!newsItem.link || newsItem.link.trim() === '') {
    throw new Error('News item must have a valid link');
  }

  const baseUrl = 'https://twitter.com/intent/tweet';
  const params = new URLSearchParams();

  // Tweet text (max 280 chars, leaving room for URL ~23 chars)
  const maxTextLength = 200;
  const text = newsItem.title.length > maxTextLength
    ? `${newsItem.title.slice(0, maxTextLength - 3)}...`
    : newsItem.title;
  params.append('text', text);

  // News URL - use the original link from the news item
  params.append('url', newsItem.link);

  // Twitter handle (optional via parameter)
  if (twitterHandle) {
    const cleanHandle = twitterHandle.replace(/^@/, '');
    if (cleanHandle) {
      params.append('via', cleanHandle);
    }
  }

  // Hashtags based on category
  const hashtags = getHashtagsFromCategory(newsItem.category);
  if (hashtags.length > 0) {
    params.append('hashtags', hashtags.join(','));
  }

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Maps news categories to relevant hashtags
 * @param category - The news category
 * @returns Array of hashtag strings (without #)
 */
const getHashtagsFromCategory = (category: NewsCategory): string[] => {
  const hashtagMap: Record<NewsCategory, string[]> = {
    general: ['News'],
    research: ['Research', 'Science'],
    product: ['Product', 'Tech'],
    company: ['Business', 'Company'],
    tutorial: ['Tutorial', 'Learning'],
    opinion: ['Opinion', 'Perspective'],
  };

  return hashtagMap[category] || [];
};

/**
 * Validates a Twitter handle format
 * @param handle - The Twitter handle to validate (with or without @)
 * @returns true if valid, false otherwise
 */
export const validateTwitterHandle = (handle: string): boolean => {
  if (!handle) return true; // Empty is valid (optional)

  const cleanHandle = handle.replace(/^@/, '');

  // Twitter handles are 1-15 characters, alphanumeric and underscore only
  const twitterHandleRegex = /^[A-Za-z0-9_]{1,15}$/;

  return twitterHandleRegex.test(cleanHandle);
};

/**
 * Opens Twitter share in a new window
 * MUST be called directly from a user click event to avoid popup blockers
 * @param url - The Twitter intent URL
 */
export const openTwitterShare = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
};

/**
 * Gets the saved Twitter handle from localStorage
 * @returns The saved Twitter handle or undefined
 */
export const getSavedTwitterHandle = (): string | undefined => {
  try {
    const saved = localStorage.getItem('twitter-handle');
    return saved || undefined;
  } catch (error) {
    console.warn('localStorage unavailable:', error);
    return undefined;
  }
};

/**
 * Saves a Twitter handle to localStorage
 * @param handle - The Twitter handle to save
 */
export const saveTwitterHandle = (handle: string): void => {
  try {
    if (handle) {
      const cleanHandle = handle.replace(/^@/, '');
      localStorage.setItem('twitter-handle', cleanHandle);
    } else {
      localStorage.removeItem('twitter-handle');
    }
  } catch (error) {
    console.warn('localStorage unavailable:', error);
  }
};
