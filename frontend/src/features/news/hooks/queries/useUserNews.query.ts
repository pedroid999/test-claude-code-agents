import { useQuery } from '@tanstack/react-query';
import { newsService } from '../../data/news.service';
import type { NewsFilters } from '../../data/news.schema';

export const useUserNewsQuery = (filters?: NewsFilters) => {
  return useQuery({
    queryKey: ['news', 'user', filters],
    queryFn: () => newsService.getUserNews(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};