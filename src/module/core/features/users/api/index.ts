import type {
  User,
  UserListParams,
  UserListEnvelope,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types';

import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

type Meta = { page: number; limit: number; total: number; total_pages: number };

export async function listUsers(
  params: UserListParams = {}
): Promise<{ data: User[]; meta: Meta }> {
  const res = await axios.get<UserListEnvelope>(endpoints.core.users.list, {
    params: {
      page: params.page,
      limit: params.limit ?? 100,
      search: params.search || undefined,
      is_active: params.is_active,
      branch_id: params.branch_id || undefined,
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

export async function getUser(id: string): Promise<User> {
  const res = await axios.get<{ data: User | null; message: string }>(
    endpoints.core.users.byId(id)
  );
  if (!res.data.data) throw new Error(res.data.message || 'User not found');
  return res.data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const res = await axios.post<{ data: User | null; message: string }>(
    endpoints.core.users.list,
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to create user');
  return res.data.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
  const res = await axios.put<{ data: User | null; message: string }>(
    endpoints.core.users.byId(id),
    payload
  );
  if (!res.data.data) throw new Error(res.data.message || 'Failed to update user');
  return res.data.data;
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  await axios.delete(endpoints.core.users.byId(id));
  return { id };
}

export async function getUserBranches(id: string): Promise<string[]> {
  const res = await axios.get<{ data: string[] | null; message: string }>(
    endpoints.core.users.branches(id)
  );
  return res.data.data ?? [];
}

export async function syncUserBranches(id: string, branchIds: string[]): Promise<void> {
  await axios.put(endpoints.core.users.branches(id), { branch_ids: branchIds });
}
