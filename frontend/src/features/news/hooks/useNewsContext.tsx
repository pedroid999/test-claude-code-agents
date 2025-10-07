import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useUserNewsQuery } from './queries/useUserNews.query';
import { useUpdateStatusMutation } from './mutations/useUpdateStatus.mutation';
import { useToggleFavoriteMutation } from './mutations/useToggleFavorite.mutation';
import { useGenerateAiNewsMutation } from './mutations/useGenerateAiNews.mutation';
import { useDeleteNewsMutation } from './mutations/useDeleteNews.mutation';
import { useDeleteAllNewsMutation } from './mutations/useDeleteAllNews.mutation';
import type { GenerateAiNewsRequest, NewsFilters, NewsItem, NewsStatus } from '../data/news.schema';

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
  generateAiNews: (data: GenerateAiNewsRequest) => void;
  deleteNews: (newsId: string) => void;
  deleteAllNews: () => void;

  // AI Generation State
  aiGeneration: {
    isLoading: boolean;
    error: Error | null;
    isSuccess: boolean;
  };

  // Delete State
  deleteState: {
    isLoading: boolean;
    error: Error | null;
  };
  
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
  
  // Mutations
  const { updateStatus } = useUpdateStatusMutation();
  const { toggleFavorite } = useToggleFavoriteMutation();
  const { generateAiNews, isLoading: isGeneratingAi, error: aiError, isSuccess: aiIsSuccess } = useGenerateAiNewsMutation();
  const { deleteNews, isLoading: isDeleting, error: deleteError } = useDeleteNewsMutation();
  const { deleteAllNews, isLoading: isDeletingAll, error: deleteAllError } = useDeleteAllNewsMutation();
  
  // Group news by status for Kanban board
  const newsByStatus = useMemo(() => {
    const news = newsData?.items || [];
    return {
      pending: news.filter(item => item.status === 'pending'),
      reading: news.filter(item => item.status === 'reading'),
      read: news.filter(item => item.status === 'read'),
    };
  }, [newsData]);
  
  // Stats - calculate from filtered data to reflect current view
  const stats = useMemo(() => {
    const news = newsData?.items || [];
    return {
      pending: news.filter(item => item.status === 'pending').length,
      reading: news.filter(item => item.status === 'reading').length,
      read: news.filter(item => item.status === 'read').length,
      favorites: news.filter(item => item.is_favorite).length,
      total: news.length,
    };
  }, [newsData]);
  
  // Actions
  const handleUpdateStatus = useCallback((newsId: string, status: NewsStatus) => {
    updateStatus({ newsId, status });
  }, [updateStatus]);
  
  const handleToggleFavorite = useCallback((newsId: string) => {
    toggleFavorite(newsId);
  }, [toggleFavorite]);

  const handleGenerateAiNews = useCallback((data: GenerateAiNewsRequest) => {
    generateAiNews(data);
  }, [generateAiNews]);

  const handleDeleteNews = useCallback((newsId: string) => {
    deleteNews(newsId);
  }, [deleteNews]);

  const handleDeleteAllNews = useCallback(() => {
    deleteAllNews();
  }, [deleteAllNews]);
  
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
    generateAiNews: handleGenerateAiNews,
    deleteNews: handleDeleteNews,
    deleteAllNews: handleDeleteAllNews,
    aiGeneration: {
      isLoading: isGeneratingAi,
      error: aiError,
      isSuccess: aiIsSuccess,
    },
    deleteState: {
      isLoading: isDeleting || isDeletingAll,
      error: deleteError || deleteAllError,
    },
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