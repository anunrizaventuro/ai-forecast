import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------

export type PermissionLevel = 'viewer' | 'editor' | 'admin';

export type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: Record<string, PermissionLevel>;
  is_system: boolean;
  is_active: boolean;
  company_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RoleListParams = {
  page?: number;
  limit?: number;
  search?: string;
  company_id?: string;
  include_global?: boolean;
};

export type CreateRolePayload = {
  code: string;
  name: string;
  description?: string;
  permissions: Record<string, PermissionLevel>;
  is_active?: boolean;
  company_id?: string | null;
};

export type UpdateRolePayload = {
  name?: string;
  description?: string;
  permissions?: Record<string, PermissionLevel>;
  is_active?: boolean;
};

export type RoleListEnvelope = ApiEnvelope<Role[]>;
