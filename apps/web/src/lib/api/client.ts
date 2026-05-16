import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/features/auth/store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  userId: string;
  username: string;
  roles: string[];
}

let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post<RefreshResponse>(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  useAuthStore.getState().setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: {
      id: data.userId,
      username: data.username,
      roles: data.roles,
    },
  });
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient.request(original);
    } catch (refreshErr) {
      useAuthStore.getState().clear();
      window.location.href = '/login';
      return Promise.reject(
        refreshErr instanceof Error ? refreshErr : new Error(String(refreshErr)),
      );
    }
  },
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await apiClient.request<T>(config);
  return data;
}
