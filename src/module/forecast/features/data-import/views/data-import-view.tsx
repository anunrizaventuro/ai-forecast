import type { ImportKind, ImportBatch } from '../api';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/module/forecast/shared/utils';
import { IS_API, invalidateForecast } from 'src/module/forecast/shared/hooks';
import { ForecastDataState, ForecastPageHeader } from 'src/module/forecast/shared/components';

import { commitImport, previewImport } from '../api';
import { useImportKinds, useImportHistory } from '../hooks';
import { ImportPreview } from '../components/import-preview';
import { ImportHistory } from '../components/import-history';
import { ImportDropzone } from '../components/import-dropzone';
import { ImportKindPicker } from '../components/import-kind-picker';

// ----------------------------------------------------------------------
// Alur: pilih jenis → unggah (backend membaca & memvalidasi → preview) →
// periksa → konfirmasi simpan → ringkasan. Tidak ada data yang ditulis
// sebelum pengguna menekan "Simpan".

const STEPS = ['Pilih jenis data', 'Unggah file', 'Periksa & simpan'];

export function DataImportView() {
  const kinds = useImportKinds();
  const history = useImportHistory();

  const [kind, setKind] = useState<ImportKind | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [committing, setCommitting] = useState(false);

  const step = batch ? 2 : kind ? 1 : 0;

  const reset = (next: ImportKind | null = null) => {
    setKind(next);
    setBatch(null);
    setError(null);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    if (!kind) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      setBatch(await previewImport(kind.id, file, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File gagal diperiksa.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!batch) return;
    setCommitting(true);
    try {
      const saved = await commitImport(batch.id);
      setResult(saved);
      reset();
      // Data dashboard & riwayat dimuat ulang dari backend.
      invalidateForecast();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Data gagal disimpan.');
    } finally {
      setCommitting(false);
      setConfirming(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Import Data"
        description="Masukkan data toko, produk, laporan kunjungan kurir, dan SPK dari file Excel atau CSV. Data diperiksa dulu sebelum disimpan."
      />

      {!IS_API ? (
        <Alert severity="info" variant="outlined">
          Import data membutuhkan backend AI Forecast. Aplikasi sedang berjalan dengan data simulasi
          (<code>VITE_FORECAST_SOURCE=simulasi</code>), jadi tidak ada database untuk menyimpan
          data.
        </Alert>
      ) : (
        <>
          <ForecastDataState
            error={kinds.error ?? history.error}
            onRetry={() => {
              kinds.refetch();
              history.refetch();
            }}
          />

          {result && (
            <Alert
              severity="success"
              variant="outlined"
              sx={{ mb: 3 }}
              onClose={() => setResult(null)}
              action={
                <Button
                  component={RouterLink}
                  href={paths.dashboard.root}
                  color="inherit"
                  size="small"
                >
                  Lihat dashboard
                </Button>
              }
            >
              <strong>{result.kindLabel} tersimpan.</strong> {fNumber(result.inserted)} data baru,{' '}
              {fNumber(result.updated)} diperbarui, {fNumber(result.unchanged)} tidak berubah
              {result.errorRows > 0 && `, ${fNumber(result.errorRows)} baris bermasalah dilewati`}.
              Dashboard dan rekomendasi sudah memakai data terbaru.
            </Alert>
          )}

          <Card sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {step < 2 && (
              <>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Impor sesuai urutan nomor: data toko dan produk lebih dulu, karena laporan
                  kunjungan dan SPK hanya diterima untuk toko yang sudah terdaftar. Mengimpor file
                  yang sama dua kali aman — data yang sudah ada tidak digandakan.
                </Typography>
                <ImportKindPicker
                  kinds={kinds.data ?? []}
                  history={history.data ?? []}
                  selected={kind?.id ?? null}
                  onSelect={(next) => reset(next)}
                />
              </>
            )}

            {step === 1 && kind && (
              <Box sx={{ mt: 4 }}>
                <ImportDropzone
                  kind={kind}
                  uploading={uploading}
                  progress={progress}
                  onFile={handleFile}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}

            {step === 2 && batch && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  {batch.kindLabel} · {batch.fileName}
                </Typography>
                <ImportPreview
                  batch={batch}
                  committing={committing}
                  onCommit={() => setConfirming(true)}
                  onCancel={() => reset(kind)}
                />
              </>
            )}
          </Card>

          <ImportHistory history={history.data ?? []} />

          <Dialog
            open={confirming}
            onClose={() => !committing && setConfirming(false)}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Simpan data ke database?</DialogTitle>
            <DialogContent>
              {batch && (
                <Typography variant="body2">
                  {fNumber(batch.inserted)} data baru ditambahkan dan {fNumber(batch.updated)} data
                  diperbarui.{' '}
                  {batch.errorRows > 0 &&
                    `${fNumber(batch.errorRows)} baris bermasalah tidak ikut disimpan. `}
                  Data lain di database tidak diubah.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => setConfirming(false)}
                disabled={committing}
              >
                Batal
              </Button>
              <Button variant="contained" onClick={handleCommit} loading={committing}>
                Simpan
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
