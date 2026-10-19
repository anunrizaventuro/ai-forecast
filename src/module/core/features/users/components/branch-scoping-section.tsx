import type { Branch } from 'src/module/core/features/branches/types';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

type Props = {
  branches: Branch[];
  companyNameById: Map<string, string>;
  checkedCompanies: Set<string>;
  checkedBranches: Set<string>;
  onToggleBranch: (branchId: string) => void;
};

export function BranchScopingSection({
  branches,
  companyNameById,
  checkedCompanies,
  checkedBranches,
  onToggleBranch,
}: Props) {
  const { t } = useTranslate('users');
  const [search, setSearch] = useState('');

  const eligible = useMemo(
    () => branches.filter((b) => checkedCompanies.has(b.company_id)),
    [branches, checkedCompanies]
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Branch[]>();
    for (const b of eligible) {
      if (q && !b.name.toLowerCase().includes(q) && !b.code.toLowerCase().includes(q)) continue;
      const list = map.get(b.company_id) ?? [];
      list.push(b);
      map.set(b.company_id, list);
    }
    const entries: { companyId: string; companyName: string; items: Branch[] }[] = [];
    for (const [companyId, name] of companyNameById) {
      const items = map.get(companyId);
      if (items && items.length > 0) {
        entries.push({ companyId, companyName: name, items });
      }
    }
    return entries;
  }, [eligible, companyNameById, search]);

  const isEmpty = eligible.length === 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 2,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle2">{t('form.branchScoping')}</Typography>

      {!isEmpty && (
        <TextField
          fullWidth
          size="small"
          label={t('form.searchBranch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {isEmpty && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', py: 2 }}
          >
            {t('form.branchScopingEmpty')}
          </Typography>
        )}

        {!isEmpty && grouped.length === 0 && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', py: 2 }}
          >
            {t('form.branchScopingNoResult')}
          </Typography>
        )}

        {!isEmpty && grouped.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {grouped.map((group) => (
              <Box
                key={group.companyId}
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    px: 0.75,
                    pb: 0.25,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {group.companyName}
                </Typography>
                {group.items.map((b) => (
                  <Box
                    key={b.id}
                    onClick={() => onToggleBranch(b.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: 0.75,
                      px: 0.75,
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={checkedBranches.has(b.id)}
                      onChange={() => onToggleBranch(b.id)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ flexShrink: 0, p: 0.25 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        pl: 0.75,
                        lineHeight: 1.25,
                        userSelect: 'none',
                        color: 'text.secondary',
                      }}
                    >
                      {b.name}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ color: 'text.secondary', ml: 0.75, opacity: 0.7 }}
                      >
                        ({b.code})
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('form.branchScopingHint')}
      </Typography>
    </Box>
  );
}
