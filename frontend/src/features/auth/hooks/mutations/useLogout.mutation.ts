
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../data/auth.service";

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Use Promise.allSettled to run both operations in parallel
      // This ensures logout never fails even if backend is down
      const results = await Promise.allSettled([
        // Call backend logout for audit logging (optional)
        authService.logout().catch((error) => {
          console.warn('Backend logout failed (continuing with client logout):', error);
          return null;
        }),
        // Clear query cache (always succeeds)
        Promise.resolve(queryClient.clear())
      ]);

      // Return success regardless of backend result
      return { success: true };
    },
    onSuccess: () => {
      // Additional cleanup can be added here if needed
    }
  });

  return {
    logout: logoutMutation.mutateAsync,
    isLoading: logoutMutation.isPending,
    error: logoutMutation.error
  };
};
