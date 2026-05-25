import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import type { OwnerResponse, PetDto } from '@/lib/api/generated/model';

export interface UpdateOwnerPayload {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  telephone?: string;
}

export interface PetPayload {
  name: string;
  birthDate?: string;
  type: string;
  petTypeId?: number;
  isActive?: boolean;
  weight?: number;
  photoId?: string;
}

export interface CustomerPet extends PetDto {
  petTypeId?: number;
  isActive?: boolean;
  weight?: number;
  photoId?: string;
}

export type MyOwnerResponse = Omit<OwnerResponse, 'pets'> & {
  pets?: CustomerPet[];
};

export const myOwnerQueryKey = ['/api/v1/owners/me'] as const;

export async function getMyOwnerProfile() {
  const { data } = await apiClient.get<MyOwnerResponse>('/api/v1/owners/me');
  return data;
}

export function useMyOwnerProfile() {
  return useQuery({
    queryKey: myOwnerQueryKey,
    queryFn: getMyOwnerProfile,
    retry: false,
  });
}

export function useUpdateMyOwnerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateOwnerPayload) => {
      const { data } = await apiClient.patch<MyOwnerResponse>(
        '/api/v1/owners/me',
        payload,
      );
      return data;
    },
    onSuccess: (owner) => {
      qc.setQueryData(myOwnerQueryKey, owner);
    },
  });
}

export function useAddMyPet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PetPayload) => {
      const { data } = await apiClient.post<MyOwnerResponse>(
        '/api/v1/owners/me/pets',
        payload,
      );
      return data;
    },
    onSuccess: (owner) => {
      qc.setQueryData(myOwnerQueryKey, owner);
    },
  });
}

export function useUpdateMyPet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ petId, payload }: { petId: number; payload: PetPayload }) => {
      const { data } = await apiClient.put<MyOwnerResponse>(
        `/api/v1/owners/me/pets/${petId}`,
        payload,
      );
      return data;
    },
    onSuccess: (owner) => {
      qc.setQueryData(myOwnerQueryKey, owner);
    },
  });
}

export function useRemoveMyPet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (petId: number) => {
      await apiClient.delete(`/api/v1/owners/me/pets/${petId}`);
      return petId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myOwnerQueryKey });
    },
  });
}
