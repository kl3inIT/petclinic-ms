import { apiRequest } from '@/lib/api/client';

/**
 * Manual API client cho auth — chỉ dùng đến khi orval codegen có aggregate spec.
 * Sau khi gen, replace bằng generated hooks và xóa file này.
 *
 * Backend mount tại `/api/v1/auth/*` (AuthController.java @RequestMapping).
 * apiRequest base = `VITE_API_BASE_URL=/api` → URL tương đối ở đây bắt đầu bằng `/v1/...`.
 */

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  userId: string;
  username: string;
  roles: string[];
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    apiRequest<AuthResponse>({ method: 'POST', url: '/v1/auth/login', data: body }),

  register: (body: RegisterRequest) =>
    apiRequest<UserResponse>({ method: 'POST', url: '/v1/auth/register', data: body }),

  me: () => apiRequest<UserResponse>({ method: 'GET', url: '/v1/auth/me' }),

  logout: () => apiRequest<void>({ method: 'POST', url: '/v1/auth/logout' }),
};
