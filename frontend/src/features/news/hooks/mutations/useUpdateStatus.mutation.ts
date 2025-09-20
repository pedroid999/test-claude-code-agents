import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';
import type { NewsStatus } from '../../data/news.schema';

interface UpdateStatusParams {
  newsId: string;
  status: NewsStatus;
}

export const useUpdateStatusMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ newsId, status }: UpdateStatusParams) =>
      newsService.updateNewsStatus(newsId, { status }),
    onSuccess: () => {
      // Invalidate all news queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('Status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });

  return {
    updateStatus: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};