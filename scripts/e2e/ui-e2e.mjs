// Uji UI end-to-end (Tahap 6): node ui-e2e.mjs <url FE> <label> — screenshot di /tmp/e2e-shots-<label>
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2];
const LABEL = process.argv[3];
const OUT = `/tmp/e2e-shots-${LABEL}`;
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'LULUS' : 'GAGAL'} [${LABEL}] ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();
const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console: ${msg.text().slice(0, 200)}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message.slice(0, 200)}`));
page.on('response', (res) => {
  if (res.url().includes('/api/v1/') && res.status() >= 500)
    problems.push(`HTTP ${res.status()} ${res.url()}`);
});

const settle = async () => {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(400);
};

// ---------------------------------------------------------------- Semua halaman
const PAGES = [
  ['/', 'Dashboard'],
  ['/rekomendasi-stok', 'Rekomendasi'],
  ['/analisis-penjualan', 'Analisis'],
  ['/toko', 'Toko'],
  ['/produk', 'Produk'],
  ['/spk', 'SPK'],
  ['/import-data', 'Import'],
  ['/pengaturan', 'Pengaturan'],
];
for (const [path, name] of PAGES) {
  const before = problems.length;
  await page.goto(BASE + path);
  await settle();
  const h = await page
    .locator('h4, h3')
    .first()
    .textContent()
    .catch(() => '');
  const chip = await page
    .getByText(/simulasi|data asli/i)
    .first()
    .isVisible()
    .catch(() => false);
  await page.screenshot({
    path: `${OUT}/page${path.replace(/\//g, '_') || '_root'}.png`,
    fullPage: false,
  });
  check(
    `halaman ${path} tampil tanpa error`,
    problems.length === before && h,
    `judul "${h?.trim()}"${chip ? '' : ', penanda sumber TIDAK terlihat'}${problems.length > before ? `; ${problems.slice(before).join(' | ')}` : ''}`
  );
}

// ---------------------------------------------------------------- Pengaturan: simpan versi baru
{
  await page.goto(`${BASE}/pengaturan`);
  await settle();
  const field = page.locator('input[name="visitIntervalDays"]');
  const old = await field.inputValue();
  await field.fill(String(old === '5' ? 6 : 5));
  await page.getByLabel('Catatan perubahan (opsional)').fill('uji UI tahap 6');
  await page.getByRole('button', { name: 'Simpan', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan', exact: true }).click();
  await settle();
  const ok = await page
    .getByText(/Versi aktif #\d+/)
    .first()
    .textContent()
    .catch(() => null);
  await page.screenshot({ path: `${OUT}/settings-saved.png` });
  check('pengaturan disimpan lewat UI', ok, ok ?? 'teks versi aktif tidak ditemukan');
}

// ---------------------------------------------------------------- SPK: buat → ubah → finalisasi → unduh
{
  await page.goto(`${BASE}/spk`);
  await settle();
  await page.getByRole('button', { name: 'Buat draf SPK' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Kurir').fill(`ui ${LABEL}`);
  await dialog.getByLabel('Toko kunjungan sales').click();
  await page.getByRole('option').first().click();
  await dialog.getByRole('button', { name: 'Tambahkan tokonya' }).click();
  const chips = await dialog.locator('.MuiChip-root').count();
  await page.screenshot({ path: `${OUT}/spk-create.png` });
  await dialog.getByRole('button', { name: 'Buat draf' }).click();
  await page.waitForURL(/\/spk\/\d+$/, { timeout: 15000 }).catch(() => {});
  await settle();
  check(
    'buat draf lewat dialog → halaman detail',
    /\/spk\/\d+$/.test(page.url()),
    `${chips} toko dipilih, url ${page.url()}`
  );
  await page.screenshot({ path: `${OUT}/spk-draft.png`, fullPage: true });

  const inputs = page.locator('table input');
  await inputs
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  const n = await inputs.count();
  check('tabel toko × roti bisa diedit', n > 0, `${n} sel input`);

  // Penjelasan hitungan: klik sel pertama yang punya saran.
  await inputs.first().click();
  const steps = await page.locator('ol li').count();
  check('panel "Cara menghitung" terisi', steps > 0, `${steps} langkah`);

  // Ubah satu angka, isi kosong, simpan.
  await inputs.first().fill('7');
  const fill = page.getByRole('button', { name: /^Isi \d+ kosong/ });
  const fillText = await fill.textContent();
  if (await fill.isEnabled()) await fill.click();
  // Sel yang wajib diisi manual (mis. kiriman terakhir pencilan) diisi 0.
  const manual = await page
    .locator('table input')
    .evaluateAll((els) =>
      els.filter((e) => e.placeholder === '?' && !e.value).map((e) => e.getAttribute('aria-label'))
    );
  for (const label of manual) await page.locator(`table input[aria-label="${label}"]`).fill('0');
  await page.getByRole('button', { name: /^Simpan perubahan/ }).click();
  await settle();
  const saved = await page
    .getByText('Perubahan disimpan.')
    .isVisible()
    .catch(() => false);
  check('simpan perubahan draf', saved, `${fillText?.trim()}; ${manual.length} sel wajib manual`);
  await page.reload();
  await page
    .locator('table input')
    .first()
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  check(
    'angka tersimpan setelah muat ulang',
    (await page.locator('table input').first().inputValue()) === '7'
  );

  await page.getByRole('button', { name: 'Finalisasi' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finalisasi' }).click();
  await settle();
  const final = await page
    .getByRole('button', { name: 'Unduh CSV' })
    .isVisible()
    .catch(() => false);
  check('finalisasi lewat UI', final && (await page.locator('table input').count()) === 0);
  await page.screenshot({ path: `${OUT}/spk-final.png`, fullPage: true });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: 'Unduh CSV' }).click(),
  ]);
  let detail = 'tidak ada unduhan';
  let ok = false;
  if (download) {
    const file = `${OUT}/${download.suggestedFilename()}`;
    await download.saveAs(file);
    const text = fs.readFileSync(file, 'utf8');
    ok =
      /^Spk_.+_\d{2}-\d{2}-\d{4}\.csv$/.test(download.suggestedFilename()) &&
      text.split('\r\n')[3].startsWith('urut;nit;nama;kurir;tanggal;mps;mpc');
    detail = `${download.suggestedFilename()}, ${text.split('\r\n').length - 1} baris`;
  }
  check('unduh CSV SPK final', ok, detail);

  await page.goto(`${BASE}/spk`);
  await settle();
  const rows = await page.locator('tbody tr').count();
  await page.screenshot({ path: `${OUT}/spk-list.png` });
  check('daftar SPK menampilkan SPK', rows > 0, `${rows} baris`);
}

// ---------------------------------------------------------------- Lebar ponsel
{
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/spk', '/pengaturan']) {
    await page.goto(BASE + path);
    await settle();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    await page.screenshot({ path: `${OUT}/mobile${path.replace(/\//g, '_')}.png` });
    check(
      `lebar ponsel ${path} tanpa scroll horizontal halaman`,
      overflow <= 1,
      `lebih ${overflow}px`
    );
  }
}

check(
  'tidak ada error konsol/halaman selama uji',
  problems.length === 0,
  problems.slice(0, 5).join(' | ')
);
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n[${LABEL}] ${results.length - failed}/${results.length} lulus`);
process.exit(failed ? 1 : 0);
