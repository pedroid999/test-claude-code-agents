export enum NewsStatus {
  PENDING = 'pending',
  READING = 'reading',
  READ = 'read'
}

export enum NewsCategory {
  GENERAL = 'general',
  RESEARCH = 'research',
  PRODUCT = 'product',
  COMPANY = 'company',
  TUTORIAL = 'tutorial',
  OPINION = 'opinion'
}

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  link: string;
  image_url: string;
  status: NewsStatus;
  category: NewsCategory;
  is_favorite: boolean;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateNewsRequest {
  source: string;
  title: string;
  summary: string;
  link: string;
  image_url?: string;
  category: NewsCategory;
  is_public: boolean;
}

export interface UpdateNewsStatusRequest {
  status: NewsStatus;
}

export interface NewsFilters {
  status?: NewsStatus;
  category?: NewsCategory;
  is_favorite?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface NewsListResponse {
  items: NewsItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface NewsStats {
  pending_count: number;
  reading_count: number;
  read_count: number;
  favorite_count: number;
  total_count: number;
}

// Category colors for UI
export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  [NewsCategory.GENERAL]: 'bg-gray-100 text-gray-800',
  [NewsCategory.RESEARCH]: 'bg-purple-100 text-purple-800',
  [NewsCategory.PRODUCT]: 'bg-blue-100 text-blue-800',
  [NewsCategory.COMPANY]: 'bg-green-100 text-green-800',
  [NewsCategory.TUTORIAL]: 'bg-yellow-100 text-yellow-800',
  [NewsCategory.OPINION]: 'bg-pink-100 text-pink-800',
};

// Status colors for UI
export const STATUS_COLORS: Record<NewsStatus, string> = {
  [NewsStatus.PENDING]: 'border-l-4 border-yellow-400',
  [NewsStatus.READING]: 'border-l-4 border-blue-400',
  [NewsStatus.READ]: 'border-l-4 border-green-400',
};