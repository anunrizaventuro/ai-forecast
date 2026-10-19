# Pattern: Approval & Audit Log

Dua endpoint core generik yang dipakai **semua feature** yang punya alur approval. FE module reusable; hook per-feature yang mapping BE→FE shape.

## Core modules (reusable)

| Module | Endpoint | Function |
|---|---|---|
| `core/approval` | `GET /core/v1/approval-requests/by-doc` | `getApprovalRequestByDoc(reffType, reffId)` |
| `core/audit-log` | `GET /core/v1/audit-logs` | `listAuditLogs({ reff_type, reff_id, ... })` |

Keduanya polymorphic via `reff_type` string — feature tinggal pass nama tabel target:
- `'finance.fund_transfers'`
- `'finance.cash_transactions'`
- `'finance.journal_entries'`
- dst.

## Per-feature hook (mapping layer)

Setiap feature punya 2 hook kecil yang:
1. Call core API
2. Mapping BE shape → FE shape
3. Handle edge case (404, auto-approved)

```ts
// hooks/use-approval-history.ts
const REFF_TYPE = 'finance.fund_transfers';

export type ApprovalHistoryKind =
  | 'empty'          // 404 = belum disubmit
  | 'auto-approved'  // total_levels === 0
  | 'with-levels';   // normal

export function useApprovalHistory(transferId: string | undefined | null) {
  const [state, setState] = useState({ kind: 'empty', request: null, levels: [], loading: false, error: null });

  const load = useCallback(async (id: string) => {
    setState({ ..., loading: true });
    try {
      const req = await getApprovalRequestByDoc(REFF_TYPE, id);
      const rawLevels = req.levels ?? [];  // guard: null for 0-level config
      const mapped = rawLevels.map((l) => ({
        level: l.level,
        role_name: l.role_name,
        status: l.status,
        actor: l.action_by ? { id: l.action_by, name: '', role: l.role_name } : null,
        acted_at: l.action_at,
        comment: l.comment,
      }));
      const kind = rawLevels.length === 0 && req.total_levels === 0 ? 'auto-approved' : 'with-levels';
      setState({ kind, request: req, levels: mapped, loading: false, error: null });
    } catch (err) {
      if ((err as any).status === 404) {
        setState({ kind: 'empty', request: null, levels: [], loading: false, error: null });
      } else {
        setState({ ..., error: err.message });
      }
    }
  }, []);

  useEffect(() => {
    if (!transferId) { setState(INITIAL); return; }
    load(transferId);
  }, [transferId, load]);

  return { ...state, refresh: () => transferId && load(transferId) };
}
```

Reference: [use-approval-history.ts](../../src/module/finance/features/fund-transfer/hooks/use-approval-history.ts)

## Audit log mapping

BE → FE shape transformation:
- `changes: { field: {old, new} }` (object) → `[{ field, from, to }]` (array)
- `actor_name` ada — bisa langsung display (tidak seperti approval yang hanya UUID)
- Action normalize — BE bisa emit `voided`, `attachment_added` dll yang tidak ada di FE enum, fallback ke `'updated'`
- Comment diekstrak dari `metadata.comment` atau `metadata.reason`

```ts
const KNOWN_ACTIONS: Record<string, AuditAction> = {
  created: 'created', updated: 'updated', submitted: 'submitted',
  approved: 'approved', rejected: 'rejected', posted: 'posted',
  cancelled: 'cancelled', deleted: 'deleted', restored: 'restored',
};
const normalizeAction = (raw: string): AuditAction => KNOWN_ACTIONS[raw] ?? 'updated';

function extractComment(log: AuditLog): string | null {
  const meta = log.metadata;
  if (!meta) return null;
  const c = meta['comment'];
  const r = meta['reason'];
  if (typeof c === 'string' && c.length > 0) return c;
  if (typeof r === 'string' && r.length > 0) return r;
  return null;
}
```

Reference: [use-audit-log.ts](../../src/module/finance/features/fund-transfer/hooks/use-audit-log.ts)

## UI rendering — tabs di detail dialog

```tsx
// Di FundTransferDetailDialog
const { t } = useTranslate('fund-transfer');
const approvalHistory = useApprovalHistory(effectiveId);
const auditLog = useAuditLog(effectiveId);

// Setelah aksi approve/reject — refresh
const handleAction = async () => {
  // ... action logic
  approvalHistory.refresh();
  auditLog.refresh();
};

// Render tabs — label via t()
<Tabs value={tab}>
  <Tab value="detail" label={t('tabs.detail')} ... />
  <Tab value="approval" label={t('tabs.approvalHistory')} ... />
  <Tab value="audit" label={t('tabs.auditLog')} ... />
</Tabs>

{tab === 'approval' && (
  <ApprovalHistoryTab
    loading={approvalHistory.loading}
    error={approvalHistory.error}
    kind={approvalHistory.kind}
    request={approvalHistory.request}
    levels={approvalHistory.levels}
  />
)}
```

## ApprovalHistoryTab — handle tagged union

```tsx
function ApprovalHistoryTab({ loading, error, kind, request, levels, t }) {
  if (loading) return <Skeleton ... />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (kind === 'empty' || !request) {
    return <EmptyState message={t('detail.noApprovalHistoryYet')} />;
  }

  if (kind === 'auto-approved') {
    return (
      <AutoApprovedCard
        title={t('detail.autoApprovedTitle')}
        desc={t('detail.autoApprovedDesc')}
        submittedLabel={t('detail.submittedAt')}
        finalizedLabel={t('detail.finalizedAt')}
        submittedAt={request.submitted_at}
        finalizedAt={request.finalized_at}
      />
    );
  }

  // with-levels — normal timeline
  return <ApprovalTimeline approvals={levels} />;
}
```

> Pattern: pass `t` sebagai prop ke sub-component kalau dia bukan React root (helper render function). Alternatif: panggil `useTranslate` di dalam sub-component (valid karena function component).

Reference: [fund-transfer-detail-dialog.tsx:ApprovalHistoryTab](../../src/module/finance/features/fund-transfer/components/fund-transfer-detail-dialog.tsx)

## Audit log rendering

Timeline list sederhana per event:
- Icon + warna per action (created=info, approved=success, rejected=error, dll.)
- Summary line (dari BE — **BE sudah localized**; bisa berbeda per bahasa tergantung implementasi BE, atau tampil apa adanya)
- Actor name + role + timestamp (format: `{{name}} · {{role}}` via `t('audit.byAndRole')`)
- Comment (kalau ada)
- Changes list (kalau ada — dari `updated` action)

**Color mapping** di `utils/format.ts` — tetap enum (language-agnostic). **Action label** pakai `t('auditActions.{action}')`:

```ts
export const AUDIT_ACTION_COLORS: Record<AuditAction, LabelColor> = {
  created: 'info', updated: 'default', submitted: 'primary',
  approved: 'success', rejected: 'error', posted: 'success',
  cancelled: 'warning', deleted: 'error', restored: 'info',
};

// Di component
<Label color={AUDIT_ACTION_COLORS[log.action]}>{t(`auditActions.${log.action}`)}</Label>
```

Status label untuk transfer sendiri (draft/waiting/posted/rejected) pakai `t('statuses.{status}')` yang sudah bilingual.

## Jangan

- ❌ Expect `levels` selalu ada — auto-approved transfer tidak punya levels
- ❌ Treat 404 sebagai error — berarti document belum disubmit, itu normal state
- ❌ Hardcode nama actor/role — snapshot dari BE di `levels[].role_name` (approval) / `actor_name` (audit)
- ❌ Refresh approval/audit saat tab tidak aktif — wait until user klik tab (current impl eager fetch sudah OK untuk dataset kecil)
