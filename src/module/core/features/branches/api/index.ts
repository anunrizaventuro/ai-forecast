import type {
  Branch,
  BranchListParams,
  BranchListEnvelope,
  CreateBranchPayload,
  UpdateBranchPayload,
  BranchListByCompaniesParams,
} from '../types';

import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

type Meta = { page: number; limit: number; total: number; total_pages: number };

export async function listBranches(params: BranchListParams = {}): Promise<Branch[]> {
  const res = await axios.get<BranchListEnvelope>(endpoints.core.branches.list, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      is_active: params.is_active,
    },
  });
  return res.data.data ?? [];
}

export async function listBranchesByCompanies(
  params: BranchListByCompaniesParams = {}
): Promise<Branch[]> {
  const companyIds = params.company_ids ?? [];
  if (companyIds.length === 0) return [];
  const res = await axios.get<BranchListEnvelope>(endpoints.core.branches.byCompanies, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      is_active: params.is_active,
      company_ids: companyIds.join(','),
    },
  });
  return res.data.data ?? [];
}

export async function listBranchesPaginated(
  params: BranchListParams = {}
): Promise<{ data: Branch[]; meta: Meta }> {
  const res = await axios.get<BranchListEnvelope>(endpoints.core.branches.list, {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      search: params.search || undefined,
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

export async function getBranch(id: string): Promise<Branch> {
  const res = await axios.get<{ data: Branch | null; message: string }>(
    endpoints.core.branches.byId(id)
  );
  if (!res.data.data) throw new Error(res.data.message || 'Branch not found');
  return res.data.data;
}

export async function createBranch(payload: CreateBranchPayload): Promise<Branch> {
  const res = await axios.post<{ data: Branch | null; message: string }>(
    endpoints.core.branches.list,
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to create branch');
  return res.data.data;
}

export async function updateBranch(id: string, payload: UpdateBranchPayload): Promise<Branch> {
  const res = await axios.put<{ data: Branch | null; message: string }>(
    endpoints.core.branches.byId(id),
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to update branch');
  return res.data.data;
}

export async function deleteBranch(id: string): Promise<{ id: string }> {
  await axios.delete(endpoints.core.branches.byId(id));
  return { id };
}
