import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------

export type Branch = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  logo_url: string | null;
  sort: number;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BranchListParams = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
};

export type BranchListByCompaniesParams = BranchListParams & {
  company_ids?: string[];
};

export type CreateBranchPayload = {
  code?: string;
  name: string;
  logo_url?: string | null;
  sort?: number;
  is_default?: boolean;
};

export type UpdateBranchPayload = {
  code?: string;
  name?: string;
  logo_url?: string | null;
  sort?: number;
  is_default?: boolean;
  is_active?: boolean;
};

export type BranchListEnvelope = ApiEnvelope<Branch[]>;
