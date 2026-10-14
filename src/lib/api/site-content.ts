import type { ApiLocale } from './client';

import { z } from 'zod';

import { apiFetch } from './client';
import { endpoints } from './endpoints';

// ----------------------------------------------------------------------
// Contract: marketplace-be/docs/api-contract/marketplace/site-content.md
// Public map — key → value already resolved to the requested locale.
// Values are free-form JSON (number, string, or object), so consumers
// narrow the type per key.

export type SiteContentMap = Record<string, unknown>;

export const SITE_CONTENT_TAG = 'site-content';

export async function getSiteContent(locale: ApiLocale = 'id'): Promise<SiteContentMap> {
  const { data } = await apiFetch<unknown>(endpoints.siteContent.map, {
    params: { locale },
    next: { revalidate: 300, tags: [SITE_CONTENT_TAG] },
  });

  return z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? {})
    .parse(data);
}

// ----------------------------------------------------------------------
// WhatsApp contact — stored under the `hubungi-kami` key. Admins may save
// either a bare phone number ("085128043814" / "+62 851-2804-3814") or a
// full URL — both normalize to a wa.me link.

export const WHATSAPP_CONTENT_KEY = 'hubungi-kami';

// Nilai ini dirender sebagai href CTA utama di home — URL bebas dari CMS
// adalah open-redirect bila akun admin/tenant disusupi. Host di luar daftar
// ini di-reject (return null → caller memakai fallback statis CONTACT.wa).
const WHATSAPP_ALLOWED_HOSTS = new Set([
  'wa.me',
  'api.whatsapp.com',
  'chat.whatsapp.com',
  'whatsapp.com',
  'www.whatsapp.com',
]);

export function toWhatsAppLink(value: unknown): string | null {
  const raw = typeof value === 'number' ? String(value) : value;

  if (typeof raw !== 'string' || !raw.trim()) return null;

  const trimmed = raw.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return WHATSAPP_ALLOWED_HOSTS.has(url.hostname.toLowerCase()) ? trimmed : null;
    } catch {
      return null;
    }
  }

  // wa.me only accepts international format without symbols: strip
  // non-digits and convert a local leading 0 to the 62 country code.
  const digits = trimmed.replace(/\D/g, '').replace(/^0/, '62');

  return digits ? `https://wa.me/${digits}` : null;
}

export async function getWhatsAppLink(locale: ApiLocale = 'id'): Promise<string | null> {
  const content = await getSiteContent(locale);

  return toWhatsAppLink(content[WHATSAPP_CONTENT_KEY]);
}
