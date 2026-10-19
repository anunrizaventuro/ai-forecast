export type ApiEnvelope<T> = {
  data: T | null;
  message: string;
  meta: unknown | null;
  errors: string | null;
};

export type User = {
  id: string;
  email: string;
  username: string;
  full_name: string;
};

export type Company = {
  id: string;
  name: string;
};

export type Client = {
  id: string;
  slug: string;
  name: string;
};

export type CompanyType = 'holding' | 'subsidiary';

export type CompanyMembership = {
  id: string;
  name: string;
  type: CompanyType;
  logo_url: string | null;
  parent_id: string | null;
  is_primary: boolean;
  is_owner: boolean;
  role_name: string | null;
  role_code: string | null;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

export type SignInResponse = TokenPair & {
  user: User;
  company: Company | null;
  client: Client | null;
  roles: string[];
  permissions: string[];
};

export type SignUpResponse = {
  message: string;
  user: User;
  company: Company;
};

export type GoogleSignInParams = {
  id_token: string;
};

export type GoogleSignInResponse = SignInResponse & {
  is_new_user: boolean;
};

export type SwitchCompanyResponse = TokenPair & {
  company: Company;
  roles: string[];
  permissions: string[];
};

export type MeResponse = {
  user: User;
  company: Company | null;
  client: Client | null;
  roles: string[];
  permissions: string[];
  is_super_admin: boolean;
};

export type AuthState = {
  loading: boolean;
  user: User | null;
  company: Company | null;
  client: Client | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  // Bumped every time the active company changes so data-fetching hooks can
  // depend on it to refetch after a company switch.
  companyVersion: number;
};

export type SignInParams = {
  login: string;
  password: string;
};

export type SignUpParams = {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
  company_name: string;
};

export type AuthContextValue = AuthState & {
  authenticated: boolean;
  unauthenticated: boolean;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signOut: (options?: { allDevices?: boolean }) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  checkUserSession: () => Promise<void>;
};
