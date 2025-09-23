import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';
import type { GenerateAiNewsRequest } from '../../data/news.schema';

export const useGenerateAiNewsMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: GenerateAiNewsRequest) => newsService.generateAiNews(data),
    onSuccess: (response) => {
      // Invalidate all news queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(response.message || `Successfully generated ${response.total_generated} AI news items`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate AI news');
    },
  });

  return {
    generateAiNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};