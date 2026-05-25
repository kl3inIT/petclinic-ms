import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export interface PetTypeResponse {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
}

export interface PetTypeRequest {
  code: string;
  name: string;
  displayOrder: number;
}

export const petTypesQueryKey = ['/api/v1/pet-types'] as const;

// TODO: thay manual axios bằng orval-generated hooks sau khi rebuild
// customers-service docker image + regenerate (POST/PUT/DELETE chưa có trong
// generated client hiện tại).

export function usePetTypes() {
  return useQuery({
    queryKey: petTypesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<PetTypeResponse[]>('/api/v1/pet-types');
      return data;
    },
    staleTime: 10 * 60 * 1000, // catalog hiếm khi đổi
  });
}

export function useCreatePetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PetTypeRequest) => {
      const { data } = await apiClient.post<PetTypeResponse>(
        '/api/v1/pet-types',
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
  });
}

export function useUpdatePetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: PetTypeRequest }) => {
      const { data } = await apiClient.put<PetTypeResponse>(
        `/api/v1/pet-types/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
  });
}

export function useDeletePetType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/v1/pet-types/${id}`);
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: petTypesQueryKey }),
  });
}
