import type { AuthRequest } from "../../data/auth.schema";
import { useMutation } from "@tanstack/react-query";
import { authService } from "../../data/auth.service";

export const useLoginMutation = () => {
  const loginMutation = useMutation({
    mutationFn: async (userData: AuthRequest) => {
      return await authService.login(userData)
    }
  })

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error
  }
}
