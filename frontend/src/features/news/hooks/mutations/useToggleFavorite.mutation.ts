import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';

export const useToggleFavoriteMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newsId: string) => newsService.toggleFavorite(newsId),
    onSuccess: (data) => {
      // Invalidate all news queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(data.is_favorite ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update favorite status');
    },
  });

  return {
    toggleFavorite: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};