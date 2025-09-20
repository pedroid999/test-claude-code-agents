import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useUserNewsQuery } from './queries/useUserNews.query';
import { useNewsStatsQuery } from './queries/useNewsStats.query';
import { useUpdateStatusMutation } from './mutations/useUpdateStatus.mutation';
import { useToggleFavoriteMutation } from './mutations/useToggleFavorite.mutation';
import type { NewsCategory, NewsFilters, NewsItem, NewsStatus } from '../data/news.schema';

interface NewsContextType {
  // State
  news: NewsItem[];
  isLoading: boolean;
  error: Error | null;
  filters: NewsFilters;
  selectedView: 'board' | 'list';
  
  // Stats
  stats: {
    pending: number;
    reading: number;
    read: number;
    favorites: number;
    total: number;
  };
  
  // Actions
  setFilters: (filters: NewsFilters) => void;
  setSelectedView: (view: 'board' | 'list') => void;
  updateNewsStatus: (newsId: string, status: NewsStatus) => void;
  toggleFavorite: (newsId: string) => void;
  
  // Grouped news for Kanban board
  newsByStatus: {
    pending: NewsItem[];
    reading: NewsItem[];
    read: NewsItem[];
  };
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export const NewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<NewsFilters>({});
  const [selectedView, setSelectedView] = useState<'board' | 'list'>('board');
  
  // Queries
  const { data: newsData, isLoading, error } = useUserNewsQuery(filters);
  const { data: statsData } = useNewsStatsQuery();
  
  // Mutations
  const { updateStatus } = useUpdateStatusMutation();
  const { toggleFavorite } = useToggleFavoriteMutation();
  
  // Group news by status for Kanban board
  const newsByStatus = useMemo(() => {
    const news = newsData?.items || [];
    return {
      pending: news.filter(item => item.status === 'pending'),
      reading: news.filter(item => item.status === 'reading'),
      read: news.filter(item => item.status === 'read'),
    };
  }, [newsData]);
  
  // Stats
  const stats = useMemo(() => ({
    pending: statsData?.pending_count || 0,
    reading: statsData?.reading_count || 0,
    read: statsData?.read_count || 0,
    favorites: statsData?.favorite_count || 0,
    total: statsData?.total_count || 0,
  }), [statsData]);
  
  // Actions
  const handleUpdateStatus = useCallback((newsId: string, status: NewsStatus) => {
    updateStatus({ newsId, status });
  }, [updateStatus]);
  
  const handleToggleFavorite = useCallback((newsId: string) => {
    toggleFavorite(newsId);
  }, [toggleFavorite]);
  
  const value: NewsContextType = {
    news: newsData?.items || [],
    isLoading,
    error,
    filters,
    selectedView,
    stats,
    setFilters,
    setSelectedView,
    updateNewsStatus: handleUpdateStatus,
    toggleFavorite: handleToggleFavorite,
    newsByStatus,
  };
  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
};

export const useNewsContext = (): NewsContextType => {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error('useNewsContext must be used within a NewsProvider');
  }
  return context;
};