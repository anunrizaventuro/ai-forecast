import type { SpkEdit, SpkLine, SpkDetail, ProductCode } from 'src/module/forecast/shared/types';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { ConfirmDialog } from 'src/shared/ui/confirm-dialog';
import { fDate, fDateTime, SPK_FILE_ORDER } from 'src/module/forecast/shared/utils';
import { useForecastMeta, useForecastSettings } from 'src/module/forecast/shared/hooks';
import {
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { useSpkDetail, useSpkActions } from '../hooks';
import { cellKey, SpkGrid } from '../components/spk-grid';
import { SPK_STATUS, explainLine } from '../components/spk-labels';

// ----------------------------------------------------------------------

export function SpkDetailView({ id }: { id: number }) {
  const { data: spk, loading, error } = useSpkDetail(id);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title={spk ? `SPK ${spk.kurir} · ${fDate(spk.tgl)}` : 'SPK'}
        description="Baris = toko sesuai urutan kunjungan, kolom = roti. Klik sel untuk melihat cara sistem menghitung sarannya."
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.spk}
            color="inherit"
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          >
            Daftar SPK
          </Button>
        }
      />
      <ForecastSimulationAlert />
      <ForecastDataState error={error} />
      {/* key: state edit direset bila SPK lain dibuka atau statusnya berubah. */}
      {spk && !loading && <SpkEditor key={`${spk.id}-${spk.status}`} spk={spk} />}
    </Box>
  );
}

// ----------------------------------------------------------------------

const lineValue = (line: SpkLine | undefined) =>
  line?.qty === null || line?.qty === undefined ? '' : String(line.qty);

function SpkEditor({ spk }: { spk: SpkDetail }) {
  const router = useRouter();
  const { storeMap, productMap } = useForecastMeta();
  const { version: activeVersion } = useForecastSettings();
  const actions = useSpkActions();

  const editable = spk.status === 'draft';
  const lines = useMemo(
    () => new Map(spk.lines.map((line) => [cellKey(line.nit, line.product), line])),
    [spk.lines]
  );

  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [note, setNote] = useState(spk.note);
  const [extraProducts, setExtraProducts] = useState<ProductCode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null
  );
  const [confirm, setConfirm] = useState<'finalize' | 'delete' | null>(null);

  const products = useMemo(() => {
    const used = new Set<ProductCode>([...spk.lines.map((l) => l.product), ...extraProducts]);
    return SPK_FILE_ORDER.filter((code) => used.has(code));
  }, [spk.lines, extraProducts]);

  const valueOf = (key: string) => edits.get(key) ?? lineValue(lines.get(key));

  const pending: SpkEdit[] = [...edits.entries()].flatMap(([key, value]) => {
    const line = lines.get(key);
    if (value === lineValue(line) || (!line && value === '')) return [];
    const [nit, product] = key.split('|') as [string, ProductCode];
    return [{ nit, product, qty: value === '' ? null : Number(value) }];
  });
  const noteChanged = note.trim() !== spk.note;
  const dirty = pending.length > 0 || noteChanged;
  // Kiriman terakhir pencilan tidak dipakai mengisi otomatis — wajib diisi manual.
  const fillable = spk.lines.filter(
    (l) =>
      valueOf(cellKey(l.nit, l.product)) === '' && l.calc && l.calc.status !== 'perlu-diperiksa'
  );
  const storesWithoutLines = spk.stores.filter((nit) => !spk.lines.some((l) => l.nit === nit));

  const run = async (task: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ severity: 'success', text: success });
      return true;
    } catch (err) {
      setMessage({ severity: 'error', text: err instanceof Error ? err.message : 'Gagal.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!dirty) return;
    await actions.update(spk.id, { lines: pending, ...(noteChanged && { note }) });
    setEdits(new Map());
  };

  const fillEmpty = () => {
    const next = new Map(edits);
    fillable.forEach((line) =>
      next.set(cellKey(line.nit, line.product), String(line.calc!.lastKirim))
    );
    setEdits(next);
  };

  const productLabel = (code: ProductCode) => {
    const nama = productMap.get(code)?.nama;
    return nama && nama.toLowerCase() !== code ? `${code} · ${nama}` : code;
  };

  const selectedLine = selected ? lines.get(selected) : undefined;
  const [selNit, selProduct] = (selected?.split('|') ?? []) as [string?, ProductCode?];

  return (
    <Stack spacing={3}>
      {message && (
        <Alert severity={message.severity} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {editable && spk.settingsVersion !== activeVersion && (
        <Alert severity="warning" variant="outlined">
          Draf ini dihitung dengan pengaturan{' '}
          {spk.settingsVersion > 0 ? `versi #${spk.settingsVersion}` : 'default'}, sedangkan versi
          aktif sekarang {activeVersion > 0 ? `#${activeVersion}` : 'default'}. Untuk memakai
          pengaturan baru, hapus draf ini lalu buat ulang.
        </Alert>
      )}

      {editable && storesWithoutLines.length > 0 && (
        <Alert severity="info" variant="outlined">
          {storesWithoutLines.length} toko tidak punya kiriman dalam {spk.settings.historyDays} hari
          sebelum {fDate(spk.dataAsOf)}, jadi tidak ada saran untuknya (
          {storesWithoutLines
            .slice(0, 5)
            .map((nit) => storeMap.get(nit)?.nama ?? nit)
            .join(', ')}
          {storesWithoutLines.length > 5 ? ', …' : ''}). Isi manual bila roti perlu dibawa.
        </Alert>
      )}

      <Card>
        <CardContent
          sx={{
            gap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
          }}
        >
          <Info label="Status">
            <Label variant="soft" color={SPK_STATUS[spk.status].color}>
              {SPK_STATUS[spk.status].label}
            </Label>
          </Info>
          <Info label="Pengaturan">
            {spk.settingsVersion > 0 ? `Versi #${spk.settingsVersion}` : 'Default'}
          </Info>
          <Info label="Data acuan s.d.">{fDate(spk.dataAsOf)}</Info>
          <Info label="Dibuat">{fDateTime(spk.createdAt)}</Info>
          <Info label={spk.finalizedAt ? 'Difinalisasi' : 'Terakhir diubah'}>
            {fDateTime(spk.finalizedAt ?? spk.updatedAt)}
          </Info>
        </CardContent>
      </Card>

      <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {editable ? (
          <>
            <Button
              variant="contained"
              disabled={!dirty || busy}
              onClick={() => run(save, 'Perubahan disimpan.')}
            >
              Simpan perubahan{pending.length ? ` (${pending.length})` : ''}
            </Button>
            <Button variant="outlined" disabled={!fillable.length || busy} onClick={fillEmpty}>
              Isi {fillable.length} kosong dengan kiriman terakhir
            </Button>
            <Autocomplete
              size="small"
              options={SPK_FILE_ORDER.filter((code) => !products.includes(code))}
              value={null}
              onChange={(_, code) => code && setExtraProducts([...extraProducts, code])}
              getOptionLabel={productLabel}
              sx={{ minWidth: 200 }}
              renderInput={(params) => <TextField {...params} label="Tambah kolom roti" />}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              color="error"
              variant="outlined"
              disabled={busy}
              onClick={() => setConfirm('delete')}
            >
              Hapus draf
            </Button>
            <Button
              color="success"
              variant="contained"
              disabled={busy}
              startIcon={<Iconify icon="eva:done-all-fill" />}
              onClick={() => setConfirm('finalize')}
            >
              Finalisasi
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:file-download-outline" />}
            onClick={() => run(() => actions.download(spk), 'File SPK diunduh.')}
            disabled={busy}
          >
            Unduh CSV
          </Button>
        )}
      </Box>

      <Box
        sx={{
          gap: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
          alignItems: 'start',
        }}
      >
        <SpkGrid
          stores={spk.stores}
          products={products}
          storeName={(nit) => storeMap.get(nit)?.nama ?? nit}
          cell={(nit, product) => {
            const key = cellKey(nit, product);
            const line = lines.get(key);
            return { value: valueOf(key), suggested: line ? line.suggested : undefined };
          }}
          editable={editable}
          selected={selected}
          onSelect={setSelected}
          onChange={(nit, product, value) =>
            setEdits(new Map(edits).set(cellKey(nit, product), value))
          }
        />

        <Stack spacing={3}>
          <Card>
            <CardHeader
              title="Cara menghitung"
              subheader={
                selNit && selProduct
                  ? `${storeMap.get(selNit)?.nama ?? selNit} · ${productLabel(selProduct)}`
                  : 'Klik sel di tabel.'
              }
            />
            <CardContent>
              {selected && (
                <Stack component="ol" spacing={1} sx={{ pl: 2, m: 0, typography: 'body2' }}>
                  {(selectedLine
                    ? explainLine(selectedLine, spk.settings)
                    : [
                        'Roti ini tidak disarankan untuk toko ini (tidak dikirim dalam periode data historis). Isi bila perlu dibawa.',
                      ]
                  ).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </Stack>
              )}
              {selectedLine?.calc &&
                selectedLine.calc.risk !== 'wajar' &&
                selectedLine.calc.risk !== 'belum-cukup' && (
                  <Typography
                    variant="caption"
                    component="p"
                    sx={{ mt: 1.5, color: 'warning.main' }}
                  >
                    Analisis menandai risiko {selectedLine.calc.risk} untuk toko × roti ini.
                  </Typography>
                )}
            </CardContent>
          </Card>

          <TextField
            label="Catatan"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!editable}
            multiline
            minRows={3}
          />
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirm === 'finalize'}
        title="Finalisasi SPK?"
        description={`SPK final tidak bisa diubah atau dihapus, dan tetap tercatat memakai pengaturan ${spk.settingsVersion > 0 ? `versi #${spk.settingsVersion}` : 'default'}.${dirty ? ' Perubahan yang belum disimpan ikut disimpan dulu.' : ''}`}
        confirmLabel="Finalisasi"
        confirmColor="success"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const ok = await run(async () => {
            await save();
            await actions.finalize(spk.id);
          }, 'SPK difinalisasi. Unduh CSV untuk dikirim ke kurir.');
          if (ok) setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Hapus draf SPK?"
        description="Draf beserta semua angka yang sudah diubah akan dihapus."
        confirmLabel="Hapus"
        confirmColor="error"
        loading={busy}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          const ok = await run(() => actions.remove(spk.id), 'Draf dihapus.');
          if (ok) router.push(paths.dashboard.spk);
        }}
      />
    </Stack>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="subtitle2" component="div">
        {children}
      </Typography>
    </Box>
  );
}
