import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// TODO: thay manual axios bằng orval-generated useChangeMyPassword sau khi
// rebuild auth-service docker + regen openapi.
export function useChangeMyPassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      await apiClient.post('/api/v1/auth/me/password', payload);
    },
  });
}
