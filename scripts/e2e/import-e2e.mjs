// Uji UI Import Data (mode api): unggah tanpa memilih jenis → dikenali otomatis → preview →
// simpan → dashboard diperbarui; ekspor database multi-sheet; pilihan jenis manual.
// node import-e2e.mjs <url FE mode api> <url BE> <file LapK yang BELUM pernah diimpor> \
//   <file Spk> <file Excel ekspor database>
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [BASE, API, LAPK, SPK, EXPORT] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
p.on('pageerror', (e) => problems.push(e.message));
p.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
const res = [];
const check = (n, ok, d = '') => {
  res.push(ok);
  console.log(`${ok ? 'LULUS' : 'GAGAL'} [import] ${n}${d ? ` — ${d}` : ''}`);
};
const errorAlerts = () =>
  p.locator('.MuiAlert-standardError, .MuiAlert-outlinedError, .MuiAlert-filledError');

// Unggah tanpa memilih jenis; tunggu preview (tombol simpan / tidak ada perubahan).
async function uploadAuto(file) {
  await p.goto(`${BASE}/import-data`);
  await p.locator('input[type=file]').setInputFiles(file);
  const ready = p.getByRole('button', { name: /^Simpan \d+ data|^Tidak ada perubahan/ });
  await ready.waitFor({ timeout: 60000 }).catch(() => {});
  return ready;
}
const heading = () =>
  p
    .getByText(/ · .*\.(csv|xlsx)$/)
    .first()
    .textContent()
    .catch(() => '');

// 1. LPK dikenali otomatis lalu disimpan.
const save = await uploadAuto(LAPK);
const label = await save.textContent().catch(() => null);
await p.screenshot({ path: '/tmp/e2e-import-preview.png', fullPage: true });
check(
  'LPK dikenali otomatis',
  (await heading()).startsWith('Laporan Kunjungan Kurir') &&
    (await p.getByText('Dikenali otomatis', { exact: true }).isVisible()),
  await heading()
);
check(
  'preview LPK baru tampil',
  /^Simpan \d+ data/.test(label ?? ''),
  label ?? 'tombol simpan tidak muncul'
);
await save.click();
await p.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
const done = p.getByText(/tersimpan\./).first();
await done.waitFor({ timeout: 30000 }).catch(() => {});
await p.screenshot({ path: '/tmp/e2e-import-done.png', fullPage: true });
check(
  'impor tersimpan',
  await done.isVisible().catch(() => false),
  await done.textContent().catch(() => '')
);

// 2. Impor ulang file yang sama: tidak ada perubahan.
const none = await uploadAuto(LAPK);
check('impor ulang file sama → tidak ada perubahan', await none.isDisabled().catch(() => false));

// 3. SPK dikenali otomatis.
await uploadAuto(SPK);
check('SPK dikenali otomatis', (await heading()).startsWith('SPK'), await heading());

// 4. Ekspor database: semua sheet dalam satu preview, masalah menyebut sheet.
await uploadAuto(EXPORT);
await p.screenshot({ path: '/tmp/e2e-import-export.png', fullPage: true });
const summary = await p
  .locator('.MuiAlert-outlinedInfo, .MuiAlert-outlinedSuccess')
  .first()
  .textContent()
  .catch(() => '');
check('ekspor database dikenali', (await heading()).startsWith('Ekspor Database'), await heading());
check(
  'ekspor membaca 5 tabel sekaligus',
  ['Toko:', 'Produk:', 'Kiriman:', 'Sisa stok:', 'BS:'].every((t) => summary.includes(t)),
  summary.slice(0, 200)
);
const sheetRow = await p
  .getByRole('cell', { name: /^(KIRIMAN|STOCK|BS|MToko|MRoti) · \d+$/ })
  .count();
check('baris contoh menyebut sheet asal', sheetRow > 0, `${sheetRow} sel`);

// 5. File yang tidak dikenali ditolak dengan pesan + arahan pilih manual.
const junk = join(tmpdir(), 'acak.csv');
writeFileSync(junk, 'a;b;c\n1;2;3\n');
await p.goto(`${BASE}/import-data`);
await p.locator('input[type=file]').setInputFiles(junk);
await errorAlerts()
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => {});
const unknown = (await errorAlerts().allTextContents()).join(' | ');
check('file tak dikenal ditolak', unknown.includes('tidak dikenali'), unknown.slice(0, 160));

// 6. Jenis manual: pilih SPK lalu unggah LPK → ditolak.
await p.goto(`${BASE}/import-data`);
await p.getByRole('button', { name: 'Pilih jenis data manual' }).click();
await p.getByText('SPK (Surat Perintah Kerja)').first().click();
await p.locator('input[type=file]').setInputFiles(LAPK);
await errorAlerts()
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => {});
const wrong = (await errorAlerts().allTextContents()).join(' | ');
check('jenis manual dihormati (LPK sebagai SPK ditolak)', wrong.length > 0, wrong.slice(0, 160));

// Meta memakai data terbaru.
const meta = await (await fetch(`${API}/api/v1/forecast/meta`)).json();
check('periode data diperbarui', !!meta.data.period.end, meta.data.period.end);
// 422 dari file yang sengaja ditolak dicatat browser sebagai error resource.
const real = problems.filter((m) => !m.includes('422'));
check('tanpa error konsol', real.length === 0, real.slice(0, 3).join(' | '));
await b.close();
console.log(`[import] ${res.filter(Boolean).length}/${res.length} lulus`);
process.exit(res.every(Boolean) ? 0 : 1);
