// Konfigurasi bahasa untuk LanguagePopover (src/layouts/components/language-popover.tsx).
// Saat ini situs single-locale (id, lihat html lang di src/app/layout.tsx) dan
// tombol switcher TIDAK dirender di layout mana pun — komponen disimpan sebagai
// titik masuk bila client butuh multi-bahasa (API sudah mendukung locale id|en;
// jalur upgrade penuh: next-intl).
export const langs = [
  { value: 'id', label: 'Bahasa Indonesia', countryCode: 'ID' },
  { value: 'en', label: 'English', countryCode: 'GB' },
];
