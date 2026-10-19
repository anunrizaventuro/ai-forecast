import type { User } from '../types';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { useTranslate } from 'src/locales';
import { toast } from 'src/shared/ui/snackbar';
import { Iconify } from 'src/shared/ui/iconify';
import { PERM } from 'src/shared/lib/permissions';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { PageHeader } from 'src/shared/ui/page-header';
import { ErrorDialog } from 'src/shared/ui/error-dialog';
import { DashboardContent } from 'src/layouts/dashboard';
import { ConfirmDialog } from 'src/shared/ui/confirm-dialog';
import { SearchNotFound } from 'src/shared/ui/search-not-found';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';
import {
  useTable,
  TableSkeleton,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/shared/ui/table';

import { deleteUser } from '../api';
import { useUserList } from '../hooks/use-user-list';
import { useUserDialog } from '../hooks/use-user-dialog';
import { UserTableRow } from '../components/user-table-row';
import { UserFormDialog } from '../components/user-form-dialog';
import { UserDetailDialog } from '../components/user-detail-dialog';

// ----------------------------------------------------------------------

export function UsersListView() {
  const { t } = useTranslate('users');
  const { t: tCommon } = useTranslate('common');
  const { can } = usePermission();
  const canCreate = can(PERM.userManagement.create);

  const dialog = useUserDialog();
  const table = useTable({ defaultRowsPerPage: 25, defaultDense: true });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const TABLE_HEAD = useMemo(
    () => [
      { id: 'name', label: t('table.name') },
      { id: 'email', label: t('table.email') },
      { id: 'role', label: t('table.role') },
      { id: 'branches', label: t('table.branches') },
      { id: 'status', label: t('table.status') },
      { id: 'actions', label: '', align: 'right' as const },
    ],
    [t]
  );

  const listParams = useMemo(
    () => ({ page: table.page + 1, limit: table.rowsPerPage, search }),
    [table.page, table.rowsPerPage, search]
  );

  const { data, meta, loading, error, refresh } = useUserList(listParams);

  const selectedUser = useMemo(
    () => (dialog.id ? (data.find((u) => u.id === dialog.id) ?? null) : null),
    [dialog.id, data]
  );

  const handleSaved = useCallback(
    (saved: User) => {
      refresh();
      dialog.close();
      toast.success(t('feedback.saved', { name: saved.full_name || saved.username }));
    },
    [dialog, refresh, t]
  );

  const onView = useCallback((id: string) => dialog.open('view', id), [dialog]);
  const onEdit = useCallback((id: string) => dialog.open('edit', id), [dialog]);

  const onDelete = useCallback(
    (id: string) => {
      const u = data.find((it) => it.id === id);
      if (u) setDeleteTarget(u);
    },
    [data]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      refresh();
      setDeleteTarget(null);
      toast.success(t('feedback.deleted'));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('errors.deleteFailed'));
    } finally {
      setActionLoading(false);
    }
  }, [deleteTarget, refresh, t]);

  const showSkeletons = loading && data.length === 0;
  const isEmpty = !loading && data.length === 0;
  const hasActiveFilters = !!search;

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader
        title={t('title')}
        action={
          canCreate ? (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => dialog.open('new')}
            >
              {t('buttons.new')}
            </Button>
          ) : null
        }
      />

      <Stack spacing={3}>
        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ p: 2.5, alignItems: { md: 'center' } }}
          >
            <TextField
              fullWidth
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                table.onResetPage();
              }}
              placeholder={t('toolbar.searchPlaceholder')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
          <Divider />

          {error && (
            <Alert severity="error" sx={{ m: 2.5 }}>
              {error}
            </Alert>
          )}

          <TableContainer>
            <Scrollbar>
              <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                <TableHeadCustom headCells={TABLE_HEAD} />
                <TableBody>
                  {showSkeletons && (
                    <TableSkeleton rowCount={table.rowsPerPage} cellCount={TABLE_HEAD.length} />
                  )}

                  {data.map((row) => (
                    <UserTableRow
                      key={row.id}
                      row={row}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}

                  {isEmpty && (
                    <TableRow>
                      <TableCell colSpan={TABLE_HEAD.length}>
                        {hasActiveFilters ? (
                          <SearchNotFound query={search} sx={{ py: 8 }} />
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
            count={meta.total}
            rowsPerPage={table.rowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={table.onChangePage}
            onRowsPerPageChange={table.onChangeRowsPerPage}
            labelRowsPerPage={tCommon('pagination.rowsPerPage')}
          />
        </Card>
      </Stack>

      <UserDetailDialog
        open={dialog.mode === 'view'}
        user={dialog.mode === 'view' ? selectedUser : null}
        onClose={dialog.close}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <UserFormDialog
        open={dialog.mode === 'new' || dialog.mode === 'edit'}
        mode={dialog.mode === 'edit' ? 'edit' : 'new'}
        seed={dialog.mode === 'edit' ? selectedUser : null}
        onClose={dialog.close}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('delete.title')}
        description={
          deleteTarget
            ? t('delete.message', { name: deleteTarget.full_name || deleteTarget.username })
            : ''
        }
        confirmLabel={tCommon('actions.delete')}
        confirmColor="error"
        loading={actionLoading}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ErrorDialog
        open={!!deleteError}
        message={deleteError ?? ''}
        onClose={() => setDeleteError(null)}
      />
    </DashboardContent>
  );
}
