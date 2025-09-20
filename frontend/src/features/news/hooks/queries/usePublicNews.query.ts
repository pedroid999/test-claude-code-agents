import { useQuery } from '@tanstack/react-query';
import { newsService } from '../../data/news.service';
import type { NewsFilters } from '../../data/news.schema';

export const usePublicNewsQuery = (filters?: Omit<NewsFilters, 'status' | 'is_favorite'>) => {
  return useQuery({
    queryKey: ['news', 'public', filters],
    queryFn: () => newsService.getPublicNews(filters),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};