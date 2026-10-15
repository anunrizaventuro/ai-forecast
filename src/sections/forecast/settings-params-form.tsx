import type { RecommendationParams } from 'src/types/forecast';
import type { RecParamsFormValues } from './recommendation-params-schema';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fNumber } from 'src/utils/format-number';

import { ApiError } from 'src/lib/api';
import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { fDate } from './forecast-utils';
import {
  toParams,
  toFormValues,
  API_FIELD_TO_FORM,
  recParamsFormSchema,
} from './recommendation-params-schema';

// ----------------------------------------------------------------------

const IS_API = CONFIG.forecastSource === 'api';

/** Field di bagian "Lanjutan" — dibuka otomatis bila salah satunya error. */
const ADVANCED_FIELDS: (keyof RecParamsFormValues)[] = [
  'window',
  'minObservations',
  'stockoutBonus',
  'maxStepPct',
  'minStep',
];

const gridSx = {
  gap: 3,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
} as const;

type ParamFieldProps = {
  name: keyof RecParamsFormValues;
  label: string;
  unit?: string;
  min: number;
  max: number;
  helperText?: React.ReactNode;
};

/** Label di atas + input angka dengan satuan (NumberInput tidak punya label sendiri). */
function ParamField({ name, label, unit, min, max, helperText }: ParamFieldProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Field.NumberInput
        name={name}
        min={min}
        max={max}
        captionText={unit}
        helperText={helperText}
        sx={{ maxWidth: 280 }}
      />
    </Box>
  );
}

/** Kalimat aturan retur dari nilai form (pratinjau). */
function rulePreview(v: RecParamsFormValues, avgInterval: number | null) {
  const days = avgInterval ? ` (≈ ${fNumber(v.returnWindow * avgInterval)} hari)` : '';
  const streak =
    v.returnStreak > 1
      ? `, dan ${v.returnStreak} kunjungan terakhir berturut-turut masing-masing di atas batas`
      : '';
  const cut =
    v.returnCutUnit === 'persen'
      ? `${v.returnCut}% dari dasar (minimal 1 pcs)`
      : `${v.returnCut} pcs`;
  return `Jika retur lebih dari ${v.returnThresholdPct}% kiriman pada ${v.returnWindow} kunjungan terakhir${days}${streak}, rekomendasi dikurangi ${cut}.`;
}

type Props = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  updatedAt: string | null;
  /** Rata-rata interval kunjungan (hari) untuk perkiraan; null bila belum ada. */
  avgInterval: number | null;
  saving: boolean;
  onSave: (params: RecommendationParams) => Promise<void>;
};

export function SettingsParamsForm({
  params,
  defaults,
  updatedAt,
  avgInterval,
  saving,
  onSave,
}: Props) {
  const methods = useForm<RecParamsFormValues>({
    resolver: zodResolver(recParamsFormSchema),
    defaultValues: toFormValues(params),
  });
  const {
    reset,
    trigger,
    setError,
    control,
    handleSubmit,
    formState: { isSubmitted },
  } = methods;

  // Params tersimpan berubah (muat api / simpan) → form ikut.
  useEffect(() => {
    reset(toFormValues(params));
  }, [params, reset]);

  const values = useWatch({ control }) as RecParamsFormValues;
  const [pending, setPending] = useState<RecParamsFormValues | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Error lintas field menempel di field pasangannya — validasi ulang saat
  // batas atasnya berubah agar pesan lama tidak tertinggal.
  useEffect(() => {
    if (isSubmitted) trigger(['minObservations', 'returnStreak']);
  }, [values.window, values.returnWindow, isSubmitted, trigger]);

  const revealErrors = (fields: string[]) => {
    if (fields.some((field) => ADVANCED_FIELDS.includes(field as keyof RecParamsFormValues))) {
      setAdvancedOpen(true);
    }
  };
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      await onSave(toParams(pending));
      setResult({ ok: true, message: 'Pengaturan disimpan. Rekomendasi dihitung ulang.' });
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        const names = Object.entries(error.errors).flatMap(([field, messages]) => {
          const name = API_FIELD_TO_FORM[field];
          if (name) setError(name, { message: messages.join(' ') });
          return name ? [name] : [];
        });
        revealErrors(names);
      }
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Form
      methods={methods}
      onSubmit={handleSubmit(setPending, (errors) => revealErrors(Object.keys(errors)))}
    >
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title="Sinyal Retur (BS)"
            subheader="Kapan rekomendasi diturunkan karena barang banyak kembali."
          />
          <CardContent>
            <Box sx={gridSx}>
              <ParamField
                name="returnThresholdPct"
                label="Batas retur maksimal"
                unit="%"
                min={1}
                max={100}
                helperText="Rasio BS ÷ kiriman kunjungan sebelumnya."
              />
              <ParamField
                name="returnWindow"
                label="Dihitung dari kunjungan terakhir"
                unit="kunjungan"
                min={1}
                max={8}
                helperText={
                  avgInterval
                    ? `≈ ${fNumber(values.returnWindow * avgInterval)} hari (interval rata-rata ${fNumber(avgInterval, 1)} hari).`
                    : undefined
                }
              />
              <ParamField
                name="returnStreak"
                label="Minimal kunjungan beruntun di atas batas"
                unit="kunjungan"
                min={1}
                max={8}
                helperText="1 = cukup rasio gabungan di atas batas."
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Besar pengurangan
                </Typography>
                <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start' }}>
                  <Field.NumberInput
                    name="returnCut"
                    min={1}
                    max={values.returnCutUnit === 'persen' ? 90 : 50}
                    captionText={values.returnCutUnit === 'persen' ? '%' : 'pcs'}
                    helperText={
                      values.returnCutUnit === 'persen'
                        ? 'Dari dasar median, minimal 1 pcs.'
                        : undefined
                    }
                  />
                  <Field.Select
                    name="returnCutUnit"
                    label="Satuan"
                    size="small"
                    sx={{ minWidth: 110 }}
                  >
                    <MenuItem value="pcs">pcs</MenuItem>
                    <MenuItem value="persen">persen</MenuItem>
                  </Field.Select>
                </Box>
              </Box>
            </Box>

            <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
              {rulePreview(values, avgInterval)}
            </Alert>
          </CardContent>
        </Card>

        <Card sx={{ px: 3 }}>
          <Accordion
            disableGutters
            expanded={advancedOpen}
            onChange={(_, expanded) => setAdvancedOpen(expanded)}
          >
            <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
              <Box>
                <Typography variant="subtitle2">Lanjutan</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Dasar median, sinyal habis, dan batas perubahan per kunjungan.
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pb: 3 }}>
              <Box sx={gridSx}>
                <ParamField
                  name="window"
                  label="Kunjungan untuk dasar median"
                  unit="kunjungan"
                  min={1}
                  max={12}
                />
                <ParamField
                  name="minObservations"
                  label="Minimal observasi riwayat sendiri"
                  unit="observasi"
                  min={1}
                  max={12}
                  helperText="Di bawah ini memakai median wilayah (kepercayaan rendah)."
                />
                <ParamField
                  name="stockoutBonus"
                  label="Tambahan saat sinyal habis"
                  unit="pcs"
                  min={0}
                  max={20}
                  helperText="BS = 0 dan STOCK = 0 pada 2 kunjungan terakhir."
                />
                <ParamField
                  name="maxStepPct"
                  label="Batas perubahan per kunjungan"
                  unit="% kiriman"
                  // NumberInput meng-clamp tiap ketikan; min 0 agar "20" bisa diketik
                  // (minimal 5 dijaga schema).
                  min={0}
                  max={100}
                />
                <ParamField
                  name="minStep"
                  label="Batas perubahan minimum"
                  unit="pcs"
                  min={0}
                  max={50}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>

        <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>
            {updatedAt ? `Terakhir disimpan ${fDate(updatedAt)}.` : 'Memakai pengaturan default.'}
            {IS_API ? '' : ' Mode simulasi: tersimpan di browser ini saja.'}
          </Typography>
          <Button
            color="inherit"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={() => reset(toFormValues(defaults))}
          >
            Kembalikan ke default
          </Button>
          <Button color="inherit" variant="outlined" onClick={() => reset(toFormValues(params))}>
            Batal
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            Simpan
          </Button>
        </Box>
      </Stack>

      <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Simpan pengaturan?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {IS_API
              ? 'Pengaturan berlaku untuk semua pengguna dashboard dan langsung mengubah rekomendasi stok.'
              : 'Pengaturan disimpan di browser ini saja (mode simulasi) dan langsung mengubah rekomendasi stok.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPending(null)}>
            Batal
          </Button>
          <Button variant="contained" onClick={handleConfirm} loading={saving}>
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
