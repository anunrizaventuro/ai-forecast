import type { ScalarKey } from './settings-fields';
import type { MasterProduct, ForecastSettings } from 'src/module/forecast/shared/types';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, Controller } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { apiFieldErrors } from 'src/shared/api';
import { Form, Field } from 'src/shared/ui/hook-form';
import { fNumber, settingsSchema, SETTINGS_API_FIELD } from 'src/module/forecast/shared/utils';

import { ParamNumberField } from './param-number-field';
import {
  FIELD_META,
  formatValue,
  diffSettings,
  ROUND_OPTIONS,
  METHOD_OPTIONS,
  exampleCalculation,
} from './settings-fields';

// ----------------------------------------------------------------------

const gridSx = {
  gap: 3,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
} as const;

const LIMITS: Partial<Record<ScalarKey, [number, number]>> = {
  visitIntervalDays: [1, 14],
  historyDays: [7, 180],
  historyVisits: [2, 12],
  minObservations: [1, 12],
  stockUsablePct: [0, 100],
  bsRiskPct: [1, 100],
  maxChangePct: [10, 300],
  roundTo: [1, 50],
  shelfLifeDays: [1, 60],
};

type Props = {
  settings: ForecastSettings;
  defaults: ForecastSettings;
  products: MasterProduct[];
  /** Rata-rata jarak kunjungan di data (hari) — pembanding interval. */
  observedInterval: number | null;
  saving: boolean;
  onSave: (params: ForecastSettings, note: string) => Promise<{ changed: boolean }>;
};

export function SettingsForm({
  settings,
  defaults,
  products,
  observedInterval,
  saving,
  onSave,
}: Props) {
  const methods = useForm<ForecastSettings>({
    resolver: zodResolver(settingsSchema) as never,
    defaultValues: settings,
    mode: 'onTouched',
  });
  const { reset, control, setError, handleSubmit } = methods;

  // Versi aktif berubah (muat api / simpan) → form ikut.
  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const values = useWatch({ control }) as ForecastSettings;
  const [pending, setPending] = useState<ForecastSettings | null>(null);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const changes = pending ? diffSettings(settings, pending) : [];

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      const { changed } = await onSave(pending, note.trim());
      setResult({
        ok: true,
        message: changed
          ? 'Pengaturan disimpan sebagai versi baru.'
          : 'Tidak ada perubahan — versi aktif tetap.',
      });
      setNote('');
    } catch (error) {
      Object.entries(apiFieldErrors(error) ?? {}).forEach(([field, messages]) => {
        const name = SETTINGS_API_FIELD[field];
        if (name) setError(name, { message: messages.join(' ') });
      });
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.',
      });
    } finally {
      setPending(null);
    }
  };

  const number = (name: ScalarKey, extraHelp?: React.ReactNode) => {
    const meta = FIELD_META[name];
    const [min, max] = LIMITS[name] ?? [0, 0];
    return (
      <div>
        <FieldTitle name={name} values={values} active={settings} defaults={defaults} />
        <ParamNumberField name={name} min={min} max={max} unit={meta.unit} sx={{ width: 1 }} />
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: 'text.secondary' }}>
          {meta.help}
          {extraHelp}
        </Typography>
      </div>
    );
  };

  const radio = (name: 'method' | 'roundMode', options: { value: string; label: string }[]) => {
    const meta = FIELD_META[name];
    return (
      <div>
        <FieldTitle name={name} values={values} active={settings} defaults={defaults} />
        <Field.RadioGroup name={name} options={options} row />
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {meta.help}
        </Typography>
      </div>
    );
  };

  return (
    <Form
      methods={methods}
      onSubmit={handleSubmit((v) => setPending(settingsSchema.parse(v) as ForecastSettings))}
    >
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title="Kunjungan & data historis"
            subheader="Data mana yang dipakai untuk memperkirakan penjualan."
          />
          <CardContent sx={gridSx}>
            {number(
              'visitIntervalDays',
              observedInterval
                ? ` Di data saat ini, jarak rata-rata antar kunjungan ≈ ${fNumber(observedInterval, 1)} hari.`
                : undefined
            )}
            {number('historyDays')}
            {number('historyVisits')}
            {number('minObservations')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Cara menghitung kebutuhan"
            subheader="Kebutuhan = perkiraan penjualan per hari × interval kunjungan, dikurangi sisa stok yang masih bisa terjual."
          />
          <CardContent sx={gridSx}>
            {radio('method', METHOD_OPTIONS)}
            {number('stockUsablePct')}
            {number('bsRiskPct')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Batas & pembulatan"
            subheader="Menjaga saran tetap wajar dan mudah dibawa."
          />
          <CardContent sx={gridSx}>
            {number('maxChangePct')}
            {number('roundTo')}
            {radio('roundMode', ROUND_OPTIONS)}
          </CardContent>
        </Card>

        <Alert severity="info" variant="outlined">
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Contoh dengan pengaturan di atas (angka contoh, bukan data toko)
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
            {settingsSchema.safeParse(values).success
              ? exampleCalculation(values).map((line) => <li key={line}>{line}</li>)
              : 'Perbaiki isian yang belum valid untuk melihat contoh.'}
          </Box>
        </Alert>

        <Card>
          <CardHeader
            title="Masa kedaluwarsa produk"
            subheader="Informasi saja. Sistem tidak tahu umur tiap roti di toko, jadi nilai ini tidak dipakai menghitung stok yang kedaluwarsa."
          />
          <CardContent>
            <Box sx={{ maxWidth: 360, mb: 3 }}>{number('shelfLifeDays')}</Box>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Kode</TableCell>
                    <TableCell>Nama produk</TableCell>
                    <TableCell width={200}>Masa kedaluwarsa khusus</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.code}>
                      <TableCell>{product.code}</TableCell>
                      <TableCell>{product.nama}</TableCell>
                      <TableCell>
                        <Controller
                          name={`productShelfLife.${product.code}`}
                          control={control}
                          render={({ field, fieldState: { error } }) => (
                            <TextField
                              size="small"
                              type="number"
                              placeholder={`${values.shelfLifeDays ?? ''} (umum)`}
                              value={typeof field.value === 'number' ? field.value : ''}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === '' ? undefined : Number(event.target.value)
                                )
                              }
                              onBlur={field.onBlur}
                              error={!!error}
                              helperText={error?.message}
                              sx={{ width: 160 }}
                              slotProps={{
                                htmlInput: { min: 1, max: 60, step: 1, inputMode: 'numeric' },
                                input: {
                                  endAdornment: <Typography variant="caption">hari</Typography>,
                                },
                              }}
                            />
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card sx={{ p: 3 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Catatan perubahan (opsional)"
            placeholder="Mis. interval diubah ke 4 hari sesuai jadwal kurir baru."
            value={note}
            onChange={(event) => setNote(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Box
            sx={{ mt: 2, gap: 1.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}
          >
            <Button color="inherit" onClick={() => reset(defaults)}>
              Isi dengan nilai default
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => reset(settings)}>
              Batal
            </Button>
            <Button type="submit" variant="contained" loading={saving}>
              Simpan
            </Button>
          </Box>
        </Card>
      </Stack>

      <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Simpan sebagai versi pengaturan baru?</DialogTitle>
        <DialogContent>
          {changes.length ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5, typography: 'body2' }}>
              {changes.map((c) => (
                <li key={c.label}>
                  {c.label}: {c.from} → <strong>{c.to}</strong>
                </li>
              ))}
            </Box>
          ) : (
            <Typography variant="body2">Tidak ada nilai yang berubah dari versi aktif.</Typography>
          )}
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Versi lama tetap tersimpan di riwayat. SPK yang sudah final tidak ikut berubah.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setPending(null)}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            loading={saving}
            disabled={!changes.length}
          >
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!result}
        autoHideDuration={5000}
        onClose={() => setResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={result?.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setResult(null)}
        >
          {result?.message}
        </Alert>
      </Snackbar>
    </Form>
  );
}

// ----------------------------------------------------------------------

/** Judul field + nilai default, dan nilai aktif bila sedang diubah di form. */
function FieldTitle({
  name,
  values,
  active,
  defaults,
}: {
  name: ScalarKey;
  values: ForecastSettings;
  active: ForecastSettings;
  defaults: ForecastSettings;
}) {
  const edited = values[name] !== active[name];
  return (
    <Box sx={{ mb: 1, gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      <Typography variant="subtitle2">{FIELD_META[name].label}</Typography>
      <Label variant="soft">Default {formatValue(name, defaults[name])}</Label>
      {edited && (
        <Label variant="soft" color="warning">
          Berlaku sekarang {formatValue(name, active[name])}
        </Label>
      )}
    </Box>
  );
}
