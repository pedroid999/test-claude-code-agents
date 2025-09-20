import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';
import type { CreateNewsRequest } from '../../data/news.schema';

export const useCreateNewsMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateNewsRequest) => newsService.createNews(data),
    onSuccess: () => {
      // Invalidate all news queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('News item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create news item');
    },
  });

  return {
    createNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};