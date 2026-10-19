import type { AuthState, SignInParams, SignUpParams, AuthContextValue } from '../../types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import { configureAxiosAuth } from 'src/shared/lib/axios';
import { getGoogleIdToken } from 'src/shared/lib/firebase';
import { invalidateAllCompanyCaches } from 'src/shared/lib/cache-registry';

import * as authApi from '../../api';
import { AuthContext } from '../auth-context';
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setActiveCompanyId,
  getActiveCompanyId,
  isAccessTokenExpired,
} from './utils';

type Props = {
  children: React.ReactNode;
};

const INITIAL_STATE: AuthState = {
  loading: true,
  user: null,
  company: null,
  client: null,
  roles: [],
  permissions: [],
  isSuperAdmin: false,
  companyVersion: 0,
};

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const applySignOut = useCallback(() => {
    clearTokens();
    setState({ ...INITIAL_STATE, loading: false });
  }, []);

  const resolveActiveCompanyId = useCallback(async (): Promise<string | null> => {
    const saved = getActiveCompanyId();
    if (saved) return saved;

    try {
      const companies = await authApi.getMyCompanies();
      if (companies.length === 0) return null;

      const primary = companies.find((c) => c.is_primary);
      const owner = companies.find((c) => c.is_owner);
      return (primary ?? owner ?? companies[0]).id;
    } catch (error) {
      console.error('[auth] failed to list companies:', error);
      return null;
    }
  }, []);

  const checkUserSession = useCallback(async () => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      setState({ ...INITIAL_STATE, loading: false });
      return;
    }

    try {
      if (!accessToken || isAccessTokenExpired(accessToken)) {
        if (!refreshToken) {
          applySignOut();
          return;
        }
        const tokens = await authApi.refreshTokens(refreshToken);
        setTokens(tokens.access_token, tokens.refresh_token);
      }

      const me = await authApi.getMe();

      if (!me.company) {
        const targetCompanyId = await resolveActiveCompanyId();
        if (targetCompanyId) {
          try {
            const res = await authApi.switchCompany(targetCompanyId);
            setTokens(res.access_token, res.refresh_token);
            setActiveCompanyId(res.company.id);
            setState({
              loading: false,
              user: me.user,
              company: res.company,
              client: me.client,
              roles: res.roles,
              permissions: res.permissions,
              isSuperAdmin: me.is_super_admin,
              companyVersion: 0,
            });
            return;
          } catch (switchError) {
            console.error('[auth] failed to restore active company:', switchError);
            setActiveCompanyId(null);
          }
        }
      } else {
        setActiveCompanyId(me.company.id);
      }

      setState({
        loading: false,
        user: me.user,
        company: me.company,
        client: me.client,
        roles: me.roles,
        permissions: me.permissions,
        isSuperAdmin: me.is_super_admin,
        companyVersion: 0,
      });
    } catch (error) {
      console.error('[auth] session check failed:', error);
      applySignOut();
    }
  }, [applySignOut, resolveActiveCompanyId]);

  useEffect(() => {
    configureAxiosAuth({
      getAccessToken,
      getRefreshToken,
      onRefresh: async (refreshToken) => {
        const tokens = await authApi.refreshTokens(refreshToken);
        setTokens(tokens.access_token, tokens.refresh_token);
        return tokens;
      },
      onUnauthorized: () => {
        applySignOut();
      },
    });

    checkUserSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (params: SignInParams) => {
    const res = await authApi.signIn(params);
    setTokens(res.access_token, res.refresh_token);
    setActiveCompanyId(res.company?.id ?? null);
    setState({
      loading: false,
      user: res.user,
      company: res.company,
      client: res.client,
      roles: res.roles,
      permissions: res.permissions,
      isSuperAdmin: false,
      companyVersion: 0,
    });
  }, []);

  const signUp = useCallback(
    async (params: SignUpParams) => {
      await authApi.signUp(params);
      await signIn({ login: params.email, password: params.password });
    },
    [signIn]
  );

  const signInWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    const res = await authApi.signInWithGoogle({ id_token: idToken });
    setTokens(res.access_token, res.refresh_token);
    setActiveCompanyId(res.company?.id ?? null);
    setState({
      loading: false,
      user: res.user,
      company: res.company,
      client: res.client,
      roles: res.roles,
      permissions: res.permissions,
      isSuperAdmin: false,
      companyVersion: 0,
    });
    return { isNewUser: res.is_new_user };
  }, []);

  const signOut = useCallback(
    async (options?: { allDevices?: boolean }) => {
      try {
        if (options?.allDevices) {
          await authApi.logoutAll();
        } else {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        }
      } catch (error) {
        console.error('[auth] sign out api failed:', error);
      } finally {
        applySignOut();
      }
    },
    [applySignOut]
  );

  const switchCompany = useCallback(async (companyId: string) => {
    const res = await authApi.switchCompany(companyId);
    setTokens(res.access_token, res.refresh_token);
    setActiveCompanyId(res.company.id);
    invalidateAllCompanyCaches();
    setState((prev) => ({
      ...prev,
      company: res.company,
      roles: res.roles,
      permissions: res.permissions,
      companyVersion: prev.companyVersion + 1,
    }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      authenticated: !state.loading && !!state.user,
      unauthenticated: !state.loading && !state.user,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      switchCompany,
      checkUserSession,
    }),
    [state, signIn, signUp, signInWithGoogle, signOut, switchCompany, checkUserSession]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
