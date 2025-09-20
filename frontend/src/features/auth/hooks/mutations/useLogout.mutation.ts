
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      queryClient.clear();
    },
    onSuccess: () => {

    }
  })

  return {
    logout: logoutMutation.mutateAsync,
    isLoading: logoutMutation.isPending,
    error: logoutMutation.error
  }
}
