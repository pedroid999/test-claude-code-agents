import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';

export function useDeleteNewsMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newsId: string) => newsService.deleteNews(newsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('News item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete news item');
    },
  });

  return {
    deleteNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
