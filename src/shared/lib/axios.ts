import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/shared/config';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
    _skipAuthRefresh?: boolean;
  }
}

type RetriableConfig = InternalAxiosRequestConfig;

type RefreshHandler = (
  refreshToken: string
) => Promise<{ access_token: string; refresh_token: string }>;
type UnauthorizedHandler = () => void;

const axiosInstance = axios.create({
  baseURL: CONFIG.serverUrl,
  headers: { 'Content-Type': 'application/json' },
});

let getAccessTokenFn: () => string | null = () => null;
let getRefreshTokenFn: () => string | null = () => null;
let refreshHandler: RefreshHandler | null = null;
let onUnauthorized: UnauthorizedHandler | null = null;

let refreshPromise: Promise<string> | null = null;

export function configureAxiosAuth(opts: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onRefresh: RefreshHandler;
  onUnauthorized: UnauthorizedHandler;
}) {
  getAccessTokenFn = opts.getAccessToken;
  getRefreshTokenFn = opts.getRefreshToken;
  refreshHandler = opts.onRefresh;
  onUnauthorized = opts.onUnauthorized;
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessTokenFn();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !original._skipAuthRefresh) {
      const refreshToken = getRefreshTokenFn();
      if (!refreshToken || !refreshHandler) {
        onUnauthorized?.();
        return Promise.reject(normalizeError(error));
      }

      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshHandler(refreshToken)
            .then((tokens) => tokens.access_token)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccessToken = await refreshPromise;
        if (!original.headers) {
          original.headers = {} as InternalAxiosRequestConfig['headers'];
        }
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(original);
      } catch (refreshError) {
        onUnauthorized?.();
        return Promise.reject(normalizeError(refreshError));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: string | null }
      | undefined;
    const detail = payload?.errors || payload?.message || error.message || 'Something went wrong!';
    const wrapped = new Error(detail);
    (wrapped as Error & { status?: number }).status = error.response?.status;
    return wrapped;
  }
  if (error instanceof Error) return error;
  return new Error('Something went wrong!');
}

export default axiosInstance;

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  const [url, config] = Array.isArray(args) ? args : [args, {}];
  const res = await axiosInstance.get<T>(url, config);
  return res.data;
};

export function withoutAuthRefresh(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return { ...config, _skipAuthRefresh: true };
}

export const endpoints = {
  auth: {
    signIn: '/core/v1/auth/signin',
    signUp: '/core/v1/auth/signup',
    google: '/core/v1/auth/google',
    refresh: '/core/v1/auth/refresh',
    logout: '/core/v1/auth/logout',
    logoutAll: '/core/v1/auth/logout-all',
    switchCompany: '/core/v1/auth/switch-company',
    me: '/core/v1/auth/me',
    companies: '/core/v1/auth/companies',
  },
  core: {
    companies: {
      list: '/core/v1/companies',
      byId: (id: string) => `/core/v1/companies/${id}`,
    },
    branches: {
      list: '/core/v1/branches',
      byCompanies: '/core/v1/branches/by-companies',
      byId: (id: string) => `/core/v1/branches/${id}`,
    },
    roles: {
      list: '/core/v1/roles',
      byId: (id: string) => `/core/v1/roles/${id}`,
      permissions: (id: string) => `/core/v1/roles/${id}/permissions`,
    },
    users: {
      list: '/core/v1/users',
      byId: (id: string) => `/core/v1/users/${id}`,
      branches: (id: string) => `/core/v1/users/${id}/branches`,
      companies: (id: string) => `/core/v1/users/${id}/companies`,
    },
    auditLogs: {
      root: '/core/v1/audit-logs',
    },
    translationOverrides: {
      base: (clientId: string) => `/core/v1/admin/clients/${clientId}/translation-overrides`,
      byKey: (clientId: string, key: string) =>
        `/core/v1/admin/clients/${clientId}/translation-overrides/${encodeURIComponent(key)}`,
      public: '/core/v1/translation-overrides',
    },
  },
} as const;
