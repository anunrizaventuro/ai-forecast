import type { SpkDetail } from 'src/module/forecast/shared/types';

import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { apiFieldErrors } from 'src/shared/api';
import { fDate, spkAsOf } from 'src/module/forecast/shared/utils';
import { useStoreSales, useForecastMeta } from 'src/module/forecast/shared/hooks';

import { useSpkActions } from '../hooks';

// ----------------------------------------------------------------------
// Buat draf: tanggal, kurir, dan toko berurutan (urut = urutan dipilih).
// Saran dihitung saat draf dibuat dengan pengaturan versi aktif.

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (spk: SpkDetail) => void;
};

export function SpkCreateDialog({ open, onClose, onCreated }: Props) {
  const { meta, storeMap } = useForecastMeta();
  const { salesMap } = useStoreSales(meta.period.end);
  const { create, activeVersion } = useSpkActions();

  const [tgl, setTgl] = useState(() => dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [kurir, setKurir] = useState('');
  const [nits, setNits] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [sales, setSales] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);

  const storesOf = useMemo(() => {
    const map = new Map<string, string[]>();
    salesMap.forEach((name, nit) => map.set(name, [...(map.get(name) ?? []), nit]));
    return map;
  }, [salesMap]);

  const addFromSales = () => {
    if (!sales) return;
    const extra = (storesOf.get(sales) ?? []).filter((nit) => !nits.includes(nit));
    setNits([...nits, ...extra.sort()]);
    if (!kurir) setKurir(sales);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      onCreated(await create({ tgl, kurir, nits, note }));
    } catch (err) {
      setErrors(apiFieldErrors(err) ?? {});
      setMessage(err instanceof Error ? err.message : 'Draf gagal dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field: string) => errors[field]?.join(' ');

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Buat draf SPK</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {message && <Alert severity="error">{message}</Alert>}

          <Box sx={{ gap: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <DatePicker
              label="Tanggal SPK"
              value={dayjs(tgl)}
              minDate={dayjs(meta.period.start).add(1, 'day')}
              format="D MMM YYYY"
              onChange={(value) => {
                if (value?.isValid()) setTgl(value.format('YYYY-MM-DD'));
              }}
              slotProps={{
                textField: {
                  error: !!fieldError('tgl'),
                  helperText:
                    fieldError('tgl') ?? `Data acuan s.d. ${fDate(spkAsOf(tgl, meta.period.end))}.`,
                },
              }}
            />
            <Autocomplete
              freeSolo
              options={meta.sales}
              inputValue={kurir}
              onInputChange={(_, value) => setKurir(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Kurir"
                  error={!!fieldError('kurir')}
                  helperText={fieldError('kurir') ?? 'Nama atau kode kurir, maksimal 20 huruf.'}
                />
              )}
            />
          </Box>

          <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <Autocomplete
              size="small"
              options={[...storesOf.keys()].sort()}
              value={sales}
              onChange={(_, value) => setSales(value)}
              getOptionLabel={(name) => `${name} (${storesOf.get(name)?.length ?? 0} toko)`}
              sx={{ minWidth: 240 }}
              renderInput={(params) => <TextField {...params} label="Toko kunjungan sales" />}
            />
            <Button variant="outlined" disabled={!sales} onClick={addFromSales}>
              Tambahkan tokonya
            </Button>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Toko yang kunjungan terakhirnya oleh sales itu.
            </Typography>
          </Box>

          <Autocomplete
            multiple
            options={meta.stores.map((s) => s.nit)}
            value={nits}
            onChange={(_, value) => setNits(value)}
            filterSelectedOptions
            getOptionLabel={(nit) => `${nit} · ${storeMap.get(nit)?.nama ?? ''}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label={`Toko (${nits.length}) — urutan = urutan kunjungan`}
                error={!!fieldError('nits')}
                helperText={fieldError('nits')}
              />
            )}
          />

          <TextField
            label="Catatan (opsional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={!!fieldError('note')}
            helperText={fieldError('note')}
            multiline
            minRows={2}
          />

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Saran dihitung dengan pengaturan versi{' '}
            {activeVersion > 0 ? `#${activeVersion}` : 'default'}. Angka bisa diubah sebelum SPK
            difinalisasi.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={onClose} disabled={saving}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          loading={saving}
          disabled={!kurir.trim() || !nits.length}
        >
          Buat draf
        </Button>
      </DialogActions>
    </Dialog>
  );
}
