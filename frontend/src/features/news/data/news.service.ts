import { apiClient } from '@/core/data/apiClient';
import type {
  CreateNewsRequest,
  NewsFilters,
  NewsItem,
  NewsListResponse,
  NewsStats,
  UpdateNewsStatusRequest,
} from './news.schema';

export const newsService = {
  async createNews(data: CreateNewsRequest): Promise<NewsItem> {
    const response = await apiClient.post<NewsItem>('/api/news', data);
    return response;
  },

  async getUserNews(filters?: NewsFilters): Promise<NewsListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_favorite !== undefined) params.append('is_favorite', String(filters.is_favorite));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<NewsListResponse>(`/api/news/user?${params}`);
    return response;
  },

  async getPublicNews(filters?: Omit<NewsFilters, 'status' | 'is_favorite'>): Promise<NewsListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await apiClient.get<NewsListResponse>(`/api/news/public?${params}`);
    return response;
  },

  async updateNewsStatus(newsId: string, data: UpdateNewsStatusRequest): Promise<NewsItem> {
    const response = await apiClient.patch<NewsItem>(`/api/news/${newsId}/status`, data);
    return response;
  },

  async toggleFavorite(newsId: string): Promise<NewsItem> {
    const response = await apiClient.patch<NewsItem>(`/api/news/${newsId}/favorite`);
    return response;
  },

  async getNewsStats(): Promise<NewsStats> {
    const response = await apiClient.get<NewsStats>('/api/news/stats');
    return response;
  },
};