import type {
  Role,
  RoleListParams,
  RoleListEnvelope,
  CreateRolePayload,
  UpdateRolePayload,
} from '../types';

import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

type Meta = { page: number; limit: number; total: number; total_pages: number };

export async function listRoles(
  params: RoleListParams = {}
): Promise<{ data: Role[]; meta: Meta }> {
  const res = await axios.get<RoleListEnvelope>(endpoints.core.roles.list, {
    params: {
      page: params.page,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      company_id: params.company_id || undefined,
      include_global: params.include_global,
    },
  });
  const payload = res.data;
  const pagination = (payload.meta as { pagination?: Meta } | null | undefined)?.pagination;
  const data = payload.data ?? [];
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

export async function getRole(id: string): Promise<Role> {
  const res = await axios.get<{ data: Role | null; message: string }>(
    endpoints.core.roles.byId(id)
  );
  if (!res.data.data) throw new Error(res.data.message || 'Role not found');
  return res.data.data;
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const res = await axios.post<{ data: Role | null; message: string }>(
    endpoints.core.roles.list,
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to create role');
  return res.data.data;
}

export async function updateRole(id: string, payload: UpdateRolePayload): Promise<Role> {
  const res = await axios.put<{ data: Role | null; message: string }>(
    endpoints.core.roles.byId(id),
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to update role');
  return res.data.data;
}

export async function deleteRole(id: string): Promise<{ id: string }> {
  await axios.delete(endpoints.core.roles.byId(id));
  return { id };
}
