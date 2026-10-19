import type { TranslationKeyInfo, TranslationOverride } from '../types';

import { useState } from 'react';

import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';
import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { PERM } from 'src/shared/lib/permissions';
import { CustomPopover } from 'src/shared/ui/custom-popover';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';

// ----------------------------------------------------------------------

export type TranslationOverrideRowData = {
  keyInfo: TranslationKeyInfo;
  override: TranslationOverride | null;
};

type Props = {
  row: TranslationOverrideRowData;
  currentLang: 'id' | 'en';
  onEdit: (key: string, hasOverride: boolean) => void;
  onReset: (override: TranslationOverride) => void;
};

export function TranslationOverrideTableRow({ row, currentLang, onEdit, onReset }: Props) {
  const { t } = useTranslate('translation-override');
  const { can } = usePermission();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handleClose = () => setAnchorEl(null);

  const hasOverride = row.override !== null;
  const defaultValue = currentLang === 'en' ? row.keyInfo.en : row.keyInfo.id;

  const canEdit = hasOverride
    ? can(PERM.translationOverrides.update)
    : can(PERM.translationOverrides.create);
  const canReset = can(PERM.translationOverrides.delete);

  const namespaceLabelKey = `namespaces.${row.keyInfo.namespace}`;
  const translatedNamespace = t(namespaceLabelKey);
  const namespaceLabel =
    translatedNamespace === namespaceLabelKey ? row.keyInfo.namespace : translatedNamespace;

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer' }}
        onClick={() => onEdit(row.keyInfo.key, hasOverride)}
      >
        <TableCell sx={{ width: 200 }}>
          <Label variant="soft" color="default">
            {namespaceLabel}
          </Label>
        </TableCell>

        <TableCell>
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>
              {defaultValue || '—'}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.7rem' }}
            >
              {row.keyInfo.path}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell>
          {hasOverride ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {row.override?.value}
              </Typography>
              <Label variant="soft" color="primary">
                {t('badge.custom')}
              </Label>
            </Stack>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
              {t('badge.default')}
            </Typography>
          )}
        </TableCell>

        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          {canEdit && (
            <MenuItem
              onClick={() => {
                handleClose();
                onEdit(row.keyInfo.key, hasOverride);
              }}
            >
              <Iconify icon="solar:pen-bold" />
              {hasOverride ? t('rowActions.edit') : t('rowActions.customize')}
            </MenuItem>
          )}

          {hasOverride && canReset && (
            <>
              <Divider sx={{ borderStyle: 'dashed' }} />
              <MenuItem
                sx={{ color: 'error.main' }}
                onClick={() => {
                  handleClose();
                  if (row.override) onReset(row.override);
                }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" />
                {t('rowActions.reset')}
              </MenuItem>
            </>
          )}
        </MenuList>
      </CustomPopover>
    </>
  );
}
