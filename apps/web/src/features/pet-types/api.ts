import { useQueryClient } from '@tanstack/react-query';

import {
  getListPetTypesQueryKey,
  useCreatePetType as useCreatePetTypeGenerated,
  useDeletePetType as useDeletePetTypeGenerated,
  useListPetTypes,
  useUpdatePetType as useUpdatePetTypeGenerated,
} from '@/lib/api/generated/pet-types/pet-types';
import type { PetTypeRequest, PetTypeResponse } from '@/lib/api/generated/model';

export type { PetTypeRequest, PetTypeResponse };

export const petTypesQueryKey = getListPetTypesQueryKey();

export function usePetTypes() {
  return useListPetTypes({
    query: { staleTime: 10 * 60 * 1000 },
  });
}

export function useCreatePetType() {
  const qc = useQueryClient();
  const m = useCreatePetTypeGenerated({
    mutation: {
      onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
    },
  });
  return {
    ...m,
    mutate: (payload: PetTypeRequest, options?: Parameters<typeof m.mutate>[1]) =>
      m.mutate({ data: payload }, options),
    mutateAsync: (payload: PetTypeRequest) => m.mutateAsync({ data: payload }),
  };
}

export function useUpdatePetType() {
  const qc = useQueryClient();
  const m = useUpdatePetTypeGenerated({
    mutation: {
      onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
    },
  });
  return {
    ...m,
    mutate: (
      vars: { id: number; payload: PetTypeRequest },
      options?: Parameters<typeof m.mutate>[1],
    ) => m.mutate({ id: vars.id, data: vars.payload }, options),
    mutateAsync: (vars: { id: number; payload: PetTypeRequest }) =>
      m.mutateAsync({ id: vars.id, data: vars.payload }),
  };
}

export function useDeletePetType() {
  const qc = useQueryClient();
  const m = useDeletePetTypeGenerated({
    mutation: {
      onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
    },
  });
  return {
    ...m,
    mutate: (id: number, options?: Parameters<typeof m.mutate>[1]) =>
      m.mutate({ id }, options),
    mutateAsync: (id: number) => m.mutateAsync({ id }),
  };
}
