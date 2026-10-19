import type { AuditLogEnvelope, AuditLogListParams, AuditLogListResponse } from '../types';

import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

async function unwrapList(
  promise: Promise<{ data: AuditLogEnvelope }>
): Promise<AuditLogListResponse> {
  const res = await promise;
  const payload = res.data;
  const data = payload.data ?? [];
  const pagination = (payload.meta as { pagination?: AuditLogListResponse['meta'] } | null)
    ?.pagination;
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

export function listAuditLogs(params: AuditLogListParams) {
  return unwrapList(
    axios.get(endpoints.core.auditLogs.root, {
      params: {
        reff_type: params.reff_type || undefined,
        reff_id: params.reff_id || undefined,
        actor_id: params.actor_id || undefined,
        action: params.action || undefined,
        date_from: params.date_from || undefined,
        date_to: params.date_to || undefined,
        page: params.page,
        limit: params.limit,
      },
    })
  );
}
