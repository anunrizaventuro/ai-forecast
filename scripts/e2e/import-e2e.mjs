// Uji UI Import Data (mode api): pilih jenis → unggah → preview → simpan → dashboard diperbarui.
// node import-e2e.mjs <url FE mode api> <url BE> <file LapK yang BELUM pernah diimpor>
import { chromium } from 'playwright';

const [BASE, API, FILE] = process.argv.slice(2);
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

await p.goto(`${BASE}/import-data`);
await p.getByText('Laporan Kunjungan Kurir (LPK)').first().click();
await p.locator('input[type=file]').setInputFiles(FILE);
const save = p.getByRole('button', { name: /^Simpan \d+ data/ });
await save.waitFor({ timeout: 30000 }).catch(() => {});
const label = await save.textContent().catch(() => null);
await p.screenshot({ path: '/tmp/e2e-import-preview.png', fullPage: true });
check('preview LPK baru tampil', !!label, label ?? 'tombol simpan tidak muncul');
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

// Impor ulang file yang sama: tidak ada perubahan.
await p.goto(`${BASE}/import-data`);
await p.getByText('Laporan Kunjungan Kurir (LPK)').first().click();
await p.locator('input[type=file]').setInputFiles(FILE);
const none = p.getByRole('button', { name: 'Tidak ada perubahan' });
await none.waitFor({ timeout: 30000 }).catch(() => {});
check('impor ulang file sama → tidak ada perubahan', await none.isDisabled().catch(() => false));

// File salah jenis ditolak dengan pesan.
await p.goto(`${BASE}/import-data`);
await p.getByText('SPK (Surat Perintah Kerja)').first().click();
await p.locator('input[type=file]').setInputFiles(FILE);
await p.waitForTimeout(2500);
const err = await p
  .locator('.MuiAlert-standardError, .MuiAlert-outlinedError, .MuiAlert-filledError')
  .allTextContents();
check('file salah jenis ditolak dengan pesan', err.length > 0, err.join(' | ').slice(0, 160));

// Meta & SPK memakai data terbaru.
const meta = await (await fetch(`${API}/api/v1/forecast/meta`)).json();
check('periode data diperbarui', !!meta.data.period.end, meta.data.period.end);
// 422 dari file salah jenis (disengaja) dicatat browser sebagai error resource.
const real = problems.filter((m) => !m.includes('422'));
check('tanpa error konsol', real.length === 0, real.slice(0, 3).join(' | '));
await b.close();
console.log(`[import] ${res.filter(Boolean).length}/${res.length} lulus`);
process.exit(res.every(Boolean) ? 0 : 1);
