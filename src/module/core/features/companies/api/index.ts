import type {
  Company,
  CompanyListParams,
  CompanyListEnvelope,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from '../types';

import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

type Meta = { page: number; limit: number; total: number; total_pages: number };

export async function listCompanies(params: CompanyListParams = {}): Promise<Company[]> {
  const res = await axios.get<CompanyListEnvelope>(endpoints.core.companies.list, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      type: params.type,
      parent_id: params.parent_id,
      is_active: params.is_active,
    },
  });
  return res.data.data ?? [];
}

export async function listCompaniesPaginated(
  params: CompanyListParams = {}
): Promise<{ data: Company[]; meta: Meta }> {
  const res = await axios.get<CompanyListEnvelope>(endpoints.core.companies.list, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      search: params.search || undefined,
      type: params.type,
      is_active: params.is_active,
    },
  });
  const payload = res.data;
  const data = payload.data ?? [];
  const pagination = (payload.meta as { pagination?: Meta } | null | undefined)?.pagination;
  return {
    data,
    meta: {
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? data.length,
      total: pagination?.total ?? data.length,
      total_pages: pagination?.total_pages ?? 1,
    },
  };
}

export async function getCompany(id: string): Promise<Company> {
  const res = await axios.get<{ data: Company | null; message: string }>(
    endpoints.core.companies.byId(id)
  );
  if (!res.data.data) throw new Error(res.data.message || 'Company not found');
  return res.data.data;
}

export async function createCompany(payload: CreateCompanyPayload): Promise<Company> {
  const res = await axios.post<{ data: Company | null; message: string }>(
    endpoints.core.companies.list,
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to create company');
  return res.data.data;
}

export async function updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
  const res = await axios.put<{ data: Company | null; message: string }>(
    endpoints.core.companies.byId(id),
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to update company');
  return res.data.data;
}

export async function deleteCompany(id: string): Promise<{ id: string }> {
  await axios.delete(endpoints.core.companies.byId(id));
  return { id };
}
