import type {
  TokenPair,
  MeResponse,
  ApiEnvelope,
  SignInParams,
  SignUpParams,
  SignInResponse,
  SignUpResponse,
  CompanyMembership,
  GoogleSignInParams,
  GoogleSignInResponse,
  SwitchCompanyResponse,
} from '../types';

import axios, { endpoints, withoutAuthRefresh } from 'src/shared/lib/axios';

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  const payload = res.data;
  if (payload.data === null || payload.data === undefined) {
    throw new Error(payload.errors || payload.message || 'Empty response');
  }
  return payload.data;
}

export function signIn(params: SignInParams) {
  return unwrap<SignInResponse>(axios.post(endpoints.auth.signIn, params));
}

export function signUp(params: SignUpParams) {
  return unwrap<SignUpResponse>(axios.post(endpoints.auth.signUp, params));
}

export function signInWithGoogle(params: GoogleSignInParams) {
  return unwrap<GoogleSignInResponse>(axios.post(endpoints.auth.google, params));
}

export function refreshTokens(refresh_token: string) {
  return unwrap<TokenPair>(
    axios.post(endpoints.auth.refresh, { refresh_token }, withoutAuthRefresh())
  );
}

export function logout(refresh_token: string) {
  return axios.post(endpoints.auth.logout, { refresh_token });
}

export function logoutAll() {
  return axios.post(endpoints.auth.logoutAll);
}

export function switchCompany(company_id: string) {
  return unwrap<SwitchCompanyResponse>(axios.post(endpoints.auth.switchCompany, { company_id }));
}

export function getMe() {
  return unwrap<MeResponse>(axios.get(endpoints.auth.me));
}

export function getMyCompanies() {
  return unwrap<CompanyMembership[]>(axios.get(endpoints.auth.companies));
}
