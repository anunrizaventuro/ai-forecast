import { useMemo } from 'react';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

export type TranslationOverrideFilters = {
  search: string;
  namespace: string;
  status: '' | 'custom' | 'default';
};

type NamespaceOption = { value: string; label: string };

type Props = {
  filters: TranslationOverrideFilters;
  namespaces: string[];
  onFilterChange: (patch: Partial<TranslationOverrideFilters>) => void;
};

export function TranslationOverrideToolbar({ filters, namespaces, onFilterChange }: Props) {
  const { t } = useTranslate('translation-override');

  const namespaceOptions = useMemo<NamespaceOption[]>(() => {
    const items = namespaces.map((ns) => {
      const labelKey = `namespaces.${ns}`;
      const translated = t(labelKey);
      const label = translated === labelKey ? ns : translated;
      return { value: ns, label };
    });
    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
  }, [namespaces, t]);

  const selectedNamespace = namespaceOptions.find((opt) => opt.value === filters.namespace) ?? null;

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ p: 2.5, alignItems: { md: 'center' } }}
    >
      <TextField
        fullWidth
        value={filters.search}
        onChange={(e) => onFilterChange({ search: e.target.value })}
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

      <Autocomplete
        sx={{ minWidth: 240 }}
        options={namespaceOptions}
        value={selectedNamespace}
        onChange={(_, next) => onFilterChange({ namespace: next?.value ?? '' })}
        getOptionLabel={(opt) => opt.label}
        isOptionEqualToValue={(opt, val) => opt.value === val.value}
        noOptionsText={t('toolbar.noNamespaceFound')}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('toolbar.namespace')}
            placeholder={t('toolbar.allNamespaces')}
          />
        )}
      />

      <TextField
        select
        value={filters.status}
        onChange={(e) =>
          onFilterChange({ status: e.target.value as TranslationOverrideFilters['status'] })
        }
        label={t('toolbar.status')}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">{t('toolbar.allStatus')}</MenuItem>
        <MenuItem value="custom">{t('toolbar.statusCustom')}</MenuItem>
        <MenuItem value="default">{t('toolbar.statusDefault')}</MenuItem>
      </TextField>
    </Stack>
  );
}
