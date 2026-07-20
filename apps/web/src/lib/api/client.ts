import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store';

/**
 * Axios client cho orval-generated hooks.
 *
 * <p><b>BASE_URL = ''</b> — orval sinh URL full (vd {@code /api/v1/auth/login}).
 * Vite dev server proxy {@code /api} → gateway {@code localhost:8180}. Prod
 * deploy phía sau ingress cùng host nên cũng dùng relative path.
 *
 * <p>Interceptor: gắn Bearer token + auto-refresh khi 401 (single-flight).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }
  if (value instanceof Date) {
    searchParams.append(key, value.toISOString());
    return;
  }
  if (typeof value === 'string') {
    searchParams.append(key, value);
    return;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    searchParams.append(key, value.toString());
    return;
  }
  throw new TypeError(`Unsupported query parameter value for "${key}"`);
}

export function serializeApiParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // OpenAPI represents Spring's Pageable as a nested object, but Spring MVC
    // binds it from top-level page, size and repeated sort query parameters.
    if (
      key === 'pageable' &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.entries(value).forEach(([pageableKey, pageableValue]) =>
        appendQueryValue(searchParams, pageableKey, pageableValue),
      );
      continue;
    }
    appendQueryValue(searchParams, key, value);
  }

  return searchParams.toString();
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: { serialize: serializeApiParams },
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
    `${BASE_URL}/api/v1/auth/refresh`,
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

/**
 * Bóc message thân thiện từ body RFC 9457 ProblemDetail của BE
 * ({@code detail} / {@code fieldErrors[]} / {@code title}) và gán vào
 * {@code error.message} để mọi {@code onError: (err) => toast(err.message)}
 * hiện đúng thông điệp BE thay vì "Request failed with status code 400".
 */
function applyProblemDetailMessage(error: AxiosError): void {
  const data = error.response?.data as
    | {
        detail?: string;
        title?: string;
        message?: string;
        fieldErrors?: Array<{ field?: string; message?: string }>;
      }
    | undefined;
  if (!data) return;
  const fromFields = data.fieldErrors?.length
    ? data.fieldErrors
        .map((f) => [f.field, f.message].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('; ')
    : undefined;
  const friendly = data.detail || fromFields || data.title || data.message;
  if (friendly) error.message = friendly;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    applyProblemDetailMessage(error);

    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (
      original.url?.includes('/api/v1/auth/login') ||
      original.url?.includes('/api/v1/auth/refresh')
    ) {
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
