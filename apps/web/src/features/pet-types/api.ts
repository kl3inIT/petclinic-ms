import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export interface PetTypeResponse {
  id: number;
  code: string;
  name: string;
  displayOrder: number;
}

export const petTypesQueryKey = ['/api/v1/pet-types'] as const;

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
