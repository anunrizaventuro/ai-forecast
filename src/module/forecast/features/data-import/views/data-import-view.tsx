import type { ImportKind, ImportBatch } from '../api';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Stepper from '@mui/material/Stepper';
import Collapse from '@mui/material/Collapse';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
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
// Alur: unggah file apa pun dari klien (backend mengenali jenisnya, membaca &
// memvalidasi → preview) → periksa → konfirmasi simpan → ringkasan. Jenis
// data bisa dipilih manual bila deteksi tidak cocok. Tidak ada data yang
// ditulis sebelum pengguna menekan "Simpan".

const STEPS = ['Unggah file', 'Periksa & simpan'];

export function DataImportView() {
  const kinds = useImportKinds();
  const history = useImportHistory();

  // null = jenis data dikenali otomatis oleh backend.
  const [kind, setKind] = useState<ImportKind | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [committing, setCommitting] = useState(false);

  const step = batch ? 1 : 0;

  const reset = (next: ImportKind | null = null) => {
    setKind(next);
    setBatch(null);
    setError(null);
    setProgress(0);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      setBatch(await previewImport(kind?.id ?? null, file, setProgress));
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
        description="Unggah file dari klien — laporan kunjungan kurir (LPK), SPK, atau Excel ekspor database. Jenis data dikenali otomatis dan diperiksa dulu sebelum disimpan."
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

            {step === 0 && (
              <>
                <ImportDropzone
                  kind={kind}
                  uploading={uploading}
                  progress={progress}
                  onFile={handleFile}
                />

                <Box
                  sx={{ mt: 3, gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}
                >
                  {kind ? (
                    <>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Jenis data dipilih manual: <strong>{kind.label}</strong>.
                      </Typography>
                      <Button size="small" onClick={() => reset(null)} disabled={uploading}>
                        Kembali ke deteksi otomatis
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => setManualOpen((open) => !open)}
                      aria-expanded={manualOpen}
                      endIcon={
                        <Iconify
                          icon={
                            manualOpen ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'
                          }
                        />
                      }
                    >
                      Pilih jenis data manual
                    </Button>
                  )}
                </Box>

                <Collapse in={manualOpen || !!kind} unmountOnExit>
                  <Box sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                      Pakai ini bila file tidak dikenali, misalnya data kiriman/sisa/BS terpisah
                      yang nama file-nya tidak menyebut jenisnya. Toko baru diimpor lebih dulu —
                      laporan kunjungan dan SPK hanya diterima untuk toko yang sudah terdaftar.
                      Mengimpor file yang sama dua kali aman — data yang sudah ada tidak digandakan.
                    </Typography>
                    <ImportKindPicker
                      kinds={kinds.data ?? []}
                      history={history.data ?? []}
                      selected={kind?.id ?? null}
                      onSelect={(next) => reset(next.id === kind?.id ? null : next)}
                    />
                  </Box>
                </Collapse>
              </>
            )}

            {error && (
              <Alert severity="error" variant="outlined" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}

            {step === 1 && batch && (
              <>
                <Box
                  sx={{ mb: 2, gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Typography variant="subtitle1">
                    {batch.kindLabel} · {batch.fileName}
                  </Typography>
                  {batch.detected && (
                    <>
                      <Label color="info" variant="soft">
                        Dikenali otomatis
                      </Label>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => {
                          reset(null);
                          setManualOpen(true);
                        }}
                        disabled={committing}
                      >
                        Bukan jenis ini? Pilih manual
                      </Button>
                    </>
                  )}
                </Box>
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
