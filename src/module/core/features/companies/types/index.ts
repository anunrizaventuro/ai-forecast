import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------

export type CompanyType = 'holding' | 'subsidiary';

export type Company = {
  id: string;
  parent_id: string | null;
  name: string;
  type: CompanyType;
  logo_url: string | null;
  owner_id: string | null;
  owner_name: string | null;
  sort: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyListParams = {
  page?: number;
  limit?: number;
  search?: string;
  parent_id?: string;
  type?: CompanyType;
  is_active?: boolean;
};

export type CreateCompanyPayload = {
  parent_id?: string | null;
  name: string;
  type: CompanyType;
  logo_url?: string | null;
  owner_id?: string | null;
};

export type UpdateCompanyPayload = {
  name?: string;
  type?: CompanyType;
  logo_url?: string | null;
  owner_id?: string | null;
  sort?: number;
  is_active?: boolean;
};

export type CompanyListEnvelope = ApiEnvelope<Company[]>;
