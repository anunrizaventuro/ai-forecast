import type { RecParamsFormValues } from 'src/module/forecast/shared/utils';
import type { AdjustUnit, RecommendationParams } from 'src/module/forecast/shared/types';

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

import { CONFIG } from 'src/shared/config';
import { apiFieldErrors } from 'src/shared/api';
import { Iconify } from 'src/shared/ui/iconify';
import { Form, Field } from 'src/shared/ui/hook-form';
import {
  fDate,
  fNumber,
  toParams,
  toFormValues,
  API_FIELD_TO_FORM,
  recParamsFormSchema,
} from 'src/module/forecast/shared/utils';

import { ParamNumberField } from './param-number-field';

// ----------------------------------------------------------------------

const IS_API = CONFIG.forecastSource === 'api';

/** Field di bagian "Lanjutan" — dibuka otomatis bila salah satunya error. */
const ADVANCED_FIELDS: (keyof RecParamsFormValues)[] = [
  'window',
  'minObservations',
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
  disabled?: boolean;
  helperText?: React.ReactNode;
};

/** Label di atas + input angka dengan satuan. */
function ParamField({ name, label, unit, min, max, disabled, helperText }: ParamFieldProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <ParamNumberField
        name={name}
        min={min}
        max={max}
        unit={unit}
        disabled={disabled}
        helperText={helperText}
        sx={{ maxWidth: 280 }}
      />
    </Box>
  );
}

type AmountFieldProps = {
  label: string;
  name: 'returnCut' | 'stockoutBonus';
  unitName: 'returnCutUnit' | 'stockoutBonusUnit';
  unit: AdjustUnit;
  maxPcs: number;
  disabled?: boolean;
};

/** Besar perubahan + pilihan satuan pcs / persen. */
function AmountField({ label, name, unitName, unit, maxPcs, disabled }: AmountFieldProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start' }}>
        <ParamNumberField
          name={name}
          min={1}
          max={unit === 'persen' ? 90 : maxPcs}
          disabled={disabled}
          unit={unit === 'persen' ? '%' : 'pcs'}
          sx={{ width: 160, flexShrink: 0 }}
          helperText={
            unit === 'persen' ? 'Dari dasar, dibulatkan ke atas (min. 1 pcs).' : undefined
          }
        />
        <Field.Select
          name={unitName}
          label="Satuan"
          size="small"
          disabled={disabled}
          sx={{ width: 140, flexShrink: 0 }}
        >
          <MenuItem value="pcs">pcs</MenuItem>
          <MenuItem value="persen">persen</MenuItem>
        </Field.Select>
      </Box>
    </Box>
  );
}

const fAmount = (unit: AdjustUnit, value: number) =>
  unit === 'persen' ? `${value}% dari dasar (dibulatkan ke atas, minimal 1 pcs)` : `${value} pcs`;

const fDays = (visits: number, avgInterval: number | null) =>
  avgInterval ? ` (≈ ${fNumber(visits * avgInterval)} hari)` : '';

/** Kalimat aturan retur tambahan dari nilai form (pratinjau). */
function returnPreview(v: RecParamsFormValues, avgInterval: number | null) {
  if (!v.returnSignalEnabled)
    return 'Tidak ada pengurangan tambahan — hanya penurunan otomatis sebesar BS.';
  const streak =
    v.returnStreak > 1
      ? `, dan ${v.returnStreak} kunjungan terakhir berturut-turut masing-masing di atas batas`
      : '';
  return `Jika retur lebih dari ${v.returnThresholdPct}% kiriman pada ${v.returnWindow} kunjungan terakhir${fDays(v.returnWindow, avgInterval)}${streak}, rekomendasi dikurangi lagi ${fAmount(v.returnCutUnit, v.returnCut)}.`;
}

/** Kalimat aturan penambahan stok habis dari nilai form (pratinjau). */
function stockoutPreview(v: RecParamsFormValues, avgInterval: number | null) {
  if (!v.stockoutEnabled) return 'Tidak ada penambahan saat stok habis.';
  return `Jika stok habis (BS = 0 dan STOCK = 0) pada ${v.stockoutStreak} kunjungan terakhir berturut-turut${fDays(v.stockoutStreak, avgInterval)}, rekomendasi ditambah ${fAmount(v.stockoutBonusUnit, v.stockoutBonus)}.`;
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
      const fieldErrors = apiFieldErrors(error);
      if (fieldErrors) {
        const names = Object.entries(fieldErrors).flatMap(([field, messages]) => {
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
            title="Penurunan karena BS (retur)"
            subheader="Rekomendasi otomatis turun sebesar BS: dasar = estimasi terjual = kiriman − BS. Jika BS konsisten 2%, rekomendasi ikut turun ±2% agar BS menuju 0."
          />
          <CardContent>
            <Field.Switch
              name="returnSignalEnabled"
              label="Pengurangan tambahan saat retur tinggi"
              helperText="Di atas penurunan otomatis, untuk toko yang retur-nya melewati batas."
              slotProps={{ wrapper: { sx: { mb: 3 } } }}
            />
            <Box sx={gridSx}>
              <ParamField
                name="returnThresholdPct"
                label="Batas retur maksimal"
                unit="%"
                min={1}
                max={100}
                disabled={!values.returnSignalEnabled}
                helperText="Rasio BS ÷ kiriman kunjungan sebelumnya."
              />
              <ParamField
                name="returnWindow"
                label="Dihitung dari kunjungan terakhir"
                unit="kunjungan"
                min={1}
                max={8}
                disabled={!values.returnSignalEnabled}
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
                disabled={!values.returnSignalEnabled}
                helperText="1 = cukup rasio gabungan di atas batas."
              />
              <AmountField
                label="Besar pengurangan tambahan"
                name="returnCut"
                unitName="returnCutUnit"
                unit={values.returnCutUnit}
                maxPcs={50}
                disabled={!values.returnSignalEnabled}
              />
            </Box>

            <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
              {returnPreview(values, avgInterval)}
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Penambahan karena stok habis"
            subheader="Stok habis berarti permintaan mungkin lebih besar dari yang terlihat — tambah sedikit untuk mengujinya."
          />
          <CardContent>
            <Field.Switch
              name="stockoutEnabled"
              label="Tambah rekomendasi saat stok habis berturut-turut"
              slotProps={{ wrapper: { sx: { mb: 3 } } }}
            />
            <Box sx={gridSx}>
              <ParamField
                name="stockoutStreak"
                label="Minimal kunjungan habis berturut-turut"
                unit="kunjungan"
                min={1}
                max={8}
                disabled={!values.stockoutEnabled}
                helperText="BS = 0 dan STOCK = 0 pada setiap kunjungan tersebut."
              />
              <AmountField
                label="Besar penambahan"
                name="stockoutBonus"
                unitName="stockoutBonusUnit"
                unit={values.stockoutBonusUnit}
                maxPcs={20}
                disabled={!values.stockoutEnabled}
              />
            </Box>

            <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
              {stockoutPreview(values, avgInterval)}
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
                  Dasar median dan batas perubahan per kunjungan.
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
                  name="maxStepPct"
                  label="Batas perubahan per kunjungan"
                  unit="% kiriman"
                  // Minimal 5 dijaga schema (pesan validasi), bukan atribut input.
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
