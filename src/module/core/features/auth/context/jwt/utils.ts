import axios from 'src/shared/lib/axios';

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ACTIVE_COMPANY_ID_KEY } from './constant';

export function jwtDecode<T = Record<string, unknown>>(token: string): T | null {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as T;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const decoded = jwtDecode<{ exp?: number }>(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 <= Date.now();
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    delete axios.defaults.headers.common.Authorization;
  }
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function setTokens(accessToken: string | null, refreshToken: string | null) {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

export function clearTokens() {
  setTokens(null, null);
  clearActiveCompanyId();
}

export function getActiveCompanyId(): string | null {
  return localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
}

export function setActiveCompanyId(companyId: string | null) {
  if (companyId) {
    localStorage.setItem(ACTIVE_COMPANY_ID_KEY, companyId);
  } else {
    localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
  }
}

export function clearActiveCompanyId() {
  localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
}
