import type { ImportKind, ImportBatch } from '../api';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/shared/ui/iconify';
import { fDateTime } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------
// Kartu jenis data, dikelompokkan dan bernomor sesuai urutan impor yang
// disarankan backend (data master dulu, lalu data harian).

type Props = {
  kinds: ImportKind[];
  history: ImportBatch[];
  selected: string | null;
  onSelect: (kind: ImportKind) => void;
};

export function ImportKindPicker({ kinds, history, selected, onSelect }: Props) {
  const groups = kinds.reduce<{ name: string; items: ImportKind[] }[]>((acc, kind) => {
    const group = acc.find((g) => g.name === kind.group);
    if (group) group.items.push(kind);
    else acc.push({ name: kind.group, items: [kind] });
    return acc;
  }, []);

  // Riwayat terurut terbaru dulu → entri pertama per jenis = impor terakhir.
  const lastImport = (kindId: string) => history.find((b) => b.kind === kindId);

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {groups.map((group) => (
        <div key={group.name}>
          <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            {group.name}
          </Typography>
          <Box
            sx={{
              gap: 2,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {group.items.map((kind) => {
              const active = kind.id === selected;
              const last = lastImport(kind.id);
              return (
                <Card
                  key={kind.id}
                  variant="outlined"
                  sx={(theme) => ({
                    borderColor: active ? 'primary.main' : undefined,
                    boxShadow: active ? `0 0 0 1px ${theme.vars.palette.primary.main}` : 'none',
                  })}
                >
                  <CardActionArea
                    onClick={() => onSelect(kind)}
                    aria-pressed={active}
                    sx={{ p: 2, height: 1, display: 'flex', alignItems: 'flex-start' }}
                  >
                    <Box
                      sx={{
                        mr: 1.5,
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: '50%',
                        typography: 'subtitle2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: active ? 'primary.main' : 'background.neutral',
                        color: active ? 'primary.contrastText' : 'text.secondary',
                      }}
                    >
                      {kind.order}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2">{kind.label}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        {kind.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 1,
                          gap: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          color: last ? 'success.main' : 'text.disabled',
                        }}
                      >
                        {last && <Iconify icon="solar:check-circle-bold" width={14} />}
                        {last?.committedAt
                          ? `Terakhir diimpor ${fDateTime(last.committedAt)}`
                          : 'Belum pernah diimpor'}
                      </Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </div>
      ))}
    </Box>
  );
}
