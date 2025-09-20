import { useMutation } from "@tanstack/react-query";
import type { RegisterRequest } from "../../data/auth.schema";
import { authService } from "../../data/auth.service";

export const useRegisterMutation = () => {
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterRequest) => {
      return await authService.register(userData)
    }
  })

  return {
    registerMutation: registerMutation.mutate,
    isPending: registerMutation.isPending,
    error: registerMutation.error
  }
};