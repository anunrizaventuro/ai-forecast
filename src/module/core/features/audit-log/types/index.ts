import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------
// Global audit log (polymorphic via reff_type + reff_id)
// ----------------------------------------------------------------------

export type AuditFieldChange = {
  old: unknown;
  new: unknown;
};

export type AuditLog = {
  id: string;
  company_id: string;
  branch_id: string | null;
  reff_type: string;
  reff_id: string;
  reff_no: string | null;
  action: string;
  summary: string | null;
  changes: Record<string, AuditFieldChange> | null;
  metadata: Record<string, unknown> | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  occurred_at: string;
  created_at: string;
};

export type AuditLogListParams = {
  reff_type?: string;
  reff_id?: string;
  actor_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
};

export type AuditLogListResponse = {
  data: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type AuditLogEnvelope = ApiEnvelope<AuditLog[]>;
