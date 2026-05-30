import { useChangeMyPassword as useChangeMyPasswordGenerated } from '@/lib/api/generated/authentication/authentication';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function useChangeMyPassword() {
  const m = useChangeMyPasswordGenerated();
  return {
    ...m,
    mutate: (payload: ChangePasswordPayload, options?: Parameters<typeof m.mutate>[1]) =>
      m.mutate({ data: payload }, options),
    mutateAsync: (payload: ChangePasswordPayload) => m.mutateAsync({ data: payload }),
  };
}
