import { apiRequest } from '@/lib/api/client';

/**
 * Manual API client cho auth — chỉ dùng đến khi orval codegen có aggregate spec.
 * Sau khi gen, replace bằng generated hooks và xóa file này.
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
  enabled: boolean;
  roles: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    apiRequest<AuthResponse>({ method: 'POST', url: '/auth/login', data: body }),

  register: (body: RegisterRequest) =>
    apiRequest<UserResponse>({ method: 'POST', url: '/auth/register', data: body }),

  me: () => apiRequest<UserResponse>({ method: 'GET', url: '/auth/me' }),

  logout: () => apiRequest<void>({ method: 'POST', url: '/auth/logout' }),
};
