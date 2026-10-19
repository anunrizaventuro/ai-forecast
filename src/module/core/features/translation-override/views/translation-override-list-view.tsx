import type { TranslationOverride } from '../types';
import type { TranslationOverrideFilters } from '../components/translation-override-toolbar';
import type { TranslationOverrideRowData } from '../components/translation-override-table-row';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useTranslate } from 'src/locales';
import { Label } from 'src/shared/ui/label';
import { toast } from 'src/shared/ui/snackbar';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { PageHeader } from 'src/shared/ui/page-header';
import { ErrorDialog } from 'src/shared/ui/error-dialog';
import { DashboardContent } from 'src/layouts/dashboard';
import { SearchNotFound } from 'src/shared/ui/search-not-found';
import {
  useTable,
  TableSkeleton,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/shared/ui/table';

import { deleteTranslationOverride } from '../api';
import { applyOverridesToI18n } from '../utils/apply-overrides';
import { useTranslationKeys } from '../hooks/use-translation-keys';
import { useTranslationOverrides } from '../hooks/use-translation-overrides';
import { useTranslationOverrideDialog } from '../hooks/use-translation-override-dialog';
import { TranslationOverrideToolbar } from '../components/translation-override-toolbar';
import { TranslationOverrideTableRow } from '../components/translation-override-table-row';
import { TranslationOverrideFormDialog } from '../components/translation-override-form-dialog';
import { TranslationOverrideDeleteDialog } from '../components/translation-override-delete-dialog';

// ----------------------------------------------------------------------

export function TranslationOverrideListView() {
  const { t, currentLang } = useTranslate('translation-override');
  const { t: tCommon } = useTranslate('common');

  const lang = currentLang.value === 'en' ? 'en' : 'id';

  const table = useTable({ defaultRowsPerPage: 50, defaultDense: true });

  const TABLE_HEAD = useMemo(
    () => [
      { id: 'module', label: t('table.module'), width: 200 },
      { id: 'default', label: t('table.default') },
      { id: 'custom', label: t('table.custom') },
      { id: 'actions', label: '', align: 'right' as const, width: 64 },
    ],
    [t]
  );

  const dialog = useTranslationOverrideDialog();
  const allKeys = useTranslationKeys();
  const { data: overrides, loading, error, clientId, refresh } = useTranslationOverrides();

  const [filters, setFilters] = useState<TranslationOverrideFilters>({
    search: '',
    namespace: '',
    status: '',
  });

  const [resetTarget, setResetTarget] = useState<TranslationOverride | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── live preview: re-apply on every list refresh ─────────────────────────
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const o of overrides) map[o.translation_key] = o.value;
    applyOverridesToI18n(map);
  }, [overrides]);

  // ── derived rows: catalog ⨝ overrides ───────────────────────────────────
  const overrideByKey = useMemo(() => {
    const m = new Map<string, TranslationOverride>();
    for (const o of overrides) m.set(o.translation_key, o);
    return m;
  }, [overrides]);

  const rows = useMemo<TranslationOverrideRowData[]>(
    () =>
      allKeys.map((keyInfo) => ({
        keyInfo,
        override: overrideByKey.get(keyInfo.key) ?? null,
      })),
    [allKeys, overrideByKey]
  );

  const namespaces = useMemo(() => {
    const set = new Set<string>();
    for (const k of allKeys) set.add(k.namespace);
    return Array.from(set).sort();
  }, [allKeys]);

  // ── filter ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.namespace && r.keyInfo.namespace !== filters.namespace) return false;
      if (filters.status === 'custom' && !r.override) return false;
      if (filters.status === 'default' && r.override) return false;
      if (!q) return true;
      const hay = [
        r.keyInfo.key,
        r.keyInfo.id,
        r.keyInfo.en,
        r.override?.value ?? '',
        r.override?.notes ?? '',
      ];
      return hay.some((s) => s.toLowerCase().includes(q));
    });
  }, [rows, filters]);

  const paged = useMemo(
    () => filtered.slice(table.page * table.rowsPerPage, (table.page + 1) * table.rowsPerPage),
    [filtered, table.page, table.rowsPerPage]
  );

  const handleFilterChange = useCallback(
    (patch: Partial<TranslationOverrideFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
      table.onResetPage();
    },
    [table]
  );

  const handleEdit = useCallback(
    (key: string, hasOverride: boolean) => {
      dialog.open(hasOverride ? 'edit' : 'new', key);
    },
    [dialog]
  );

  const handleReset = useCallback((override: TranslationOverride) => {
    setResetTarget(override);
  }, []);

  const handleConfirmReset = useCallback(async () => {
    if (!resetTarget || !clientId) return;
    setActionLoading(true);
    try {
      await deleteTranslationOverride(clientId, resetTarget.translation_key);
      toast.success(t('feedback.reset'));
      setResetTarget(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('feedback.actionFailed'));
    } finally {
      setActionLoading(false);
    }
  }, [resetTarget, clientId, refresh, t]);

  const handleSaved = useCallback(() => {
    toast.success(dialog.mode === 'edit' ? t('feedback.updated') : t('feedback.created'));
    dialog.close();
    refresh();
  }, [dialog, refresh, t]);

  const dialogKey = dialog.mode ? dialog.key : null;
  const dialogKeyInfo = useMemo(
    () => (dialogKey ? (allKeys.find((k) => k.key === dialogKey) ?? null) : null),
    [dialogKey, allKeys]
  );
  const dialogOverride = useMemo(
    () => (dialogKey ? (overrideByKey.get(dialogKey) ?? null) : null),
    [dialogKey, overrideByKey]
  );

  const showSkeletons = loading && overrides.length === 0;
  const isEmpty = !loading && filtered.length === 0;
  const hasActiveFilters = !!(filters.search || filters.namespace || filters.status);

  const customCount = overrides.length;
  const totalCount = allKeys.length;

  if (!clientId && !loading) {
    return (
      <DashboardContent maxWidth="xl">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Alert severity="warning">{t('errors.noClient')}</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        title={t('title')}
        action={
          <Label variant="soft" color="primary" sx={{ height: 32, px: 1.5 }}>
            {t('subtitleWithCount', { custom: customCount, total: totalCount })}
          </Label>
        }
      />

      <Stack spacing={3}>
        <Card>
          <TranslationOverrideToolbar
            filters={filters}
            namespaces={namespaces}
            onFilterChange={handleFilterChange}
          />

          <Divider />

          {error ? (
            <Alert severity="error" sx={{ m: 2.5 }}>
              {error}
            </Alert>
          ) : null}

          <TableContainer>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 720 }}>
                <TableHeadCustom headCells={TABLE_HEAD} />

                <TableBody>
                  {showSkeletons && (
                    <TableSkeleton rowCount={table.rowsPerPage} cellCount={TABLE_HEAD.length} />
                  )}

                  {paged.map((row) => (
                    <TranslationOverrideTableRow
                      key={row.keyInfo.key}
                      row={row}
                      currentLang={lang}
                      onEdit={handleEdit}
                      onReset={handleReset}
                    />
                  ))}

                  {isEmpty && (
                    <TableRow>
                      <TableCell colSpan={TABLE_HEAD.length}>
                        {hasActiveFilters ? (
                          <SearchNotFound query={filters.search} sx={{ py: 8 }} />
                        ) : (
                          <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography variant="h6">{t('list.emptyTitle')}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                              {t('list.emptySubtitle')}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            component="div"
            page={table.page}
            count={filtered.length}
            rowsPerPage={table.rowsPerPage}
            rowsPerPageOptions={[25, 50, 100, 200]}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            labelRowsPerPage={tCommon('pagination.rowsPerPage')}
          />
        </Card>
      </Stack>

      <TranslationOverrideFormDialog
        open={dialog.mode === 'new' || dialog.mode === 'edit'}
        mode={dialog.mode === 'edit' ? 'edit' : 'new'}
        clientId={clientId}
        translationKey={dialogKey}
        override={dialogOverride}
        keyInfo={dialogKeyInfo}
        onClose={dialog.close}
        onSaved={handleSaved}
      />

      <TranslationOverrideDeleteDialog
        open={resetTarget !== null}
        value={resetTarget?.value ?? ''}
        loading={actionLoading}
        onClose={() => setResetTarget(null)}
        onConfirm={handleConfirmReset}
      />

      <ErrorDialog
        open={!!actionError}
        message={actionError ?? ''}
        onClose={() => setActionError(null)}
      />
    </DashboardContent>
  );
}
