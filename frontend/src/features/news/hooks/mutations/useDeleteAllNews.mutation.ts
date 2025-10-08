import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { newsService } from '../../data/news.service';

export function useDeleteAllNewsMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => newsService.deleteAllUserNews(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(`Successfully deleted ${data.deleted_count} news items`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete news items');
    },
  });

  return {
    deleteAllNews: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
