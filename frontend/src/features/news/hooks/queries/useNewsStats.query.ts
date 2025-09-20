import { useQuery } from '@tanstack/react-query';
import { newsService } from '../../data/news.service';

export const useNewsStatsQuery = () => {
  return useQuery({
    queryKey: ['news', 'stats'],
    queryFn: () => newsService.getNewsStats(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};