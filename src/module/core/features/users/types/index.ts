import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------

export type UserCompanyInfo = {
  company_id: string;
  company_name: string;
  is_owner: boolean;
};

export type UserBranchInfo = {
  branch_id: string;
  branch_code: string;
  branch_name: string;
  company_id: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  role_name?: string;
  companies?: UserCompanyInfo[];
  branches?: UserBranchInfo[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  branch_id?: string;
};

export type CreateUserPayload = {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
  role_id?: string;
  company_ids?: string[];
  branch_ids?: string[];
};

export type UpdateUserPayload = {
  email?: string;
  username?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  role_id?: string;
  company_ids?: string[];
  branch_ids?: string[];
};

export type UserListEnvelope = ApiEnvelope<User[]>;
