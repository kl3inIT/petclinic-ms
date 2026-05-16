import { apiClient } from './client';
import type { AxiosRequestConfig } from 'axios';

/**
 * Orval mutator — adapter bắt buộc orval gọi mỗi request.
 * Trả về Promise<T> (chỉ data) thay vì AxiosResponse<T> để hook generated dùng trực tiếp.
 */
export const apiMutator = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const { data } = await apiClient.request<T>(config);
  return data;
};

export type ErrorType<E> = E;
export type BodyType<B> = B;
