import type { TranslationKeyInfo } from '../types';

// ----------------------------------------------------------------------
// Eagerly load every i18n JSON bundle so the override catalog can be built
// synchronously. Vite resolves these imports at build time — bundle impact
// is the same whether we glob-import here or lazy-load via i18next.
// ----------------------------------------------------------------------

const idBundles = import.meta.glob<Record<string, unknown>>('/src/locales/langs/id/*.json', {
  eager: true,
  import: 'default',
});

const enBundles = import.meta.glob<Record<string, unknown>>('/src/locales/langs/en/*.json', {
  eager: true,
  import: 'default',
});

function namespaceOf(filePath: string): string {
  // '/src/locales/langs/id/contacts.json' -> 'contacts'
  const match = /\/([^/]+)\.json$/.exec(filePath);
  return match ? match[1] : '';
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, path));
    } else if (typeof v === 'string') {
      out[path] = v;
    }
    // skip arrays / numbers / nullish — they're not user-facing copy
  }
  return out;
}

// ----------------------------------------------------------------------

type FlatBundlesByNamespace = Record<string, Record<string, string>>;

function buildFlatBundles(
  rawBundles: Record<string, Record<string, unknown>>
): FlatBundlesByNamespace {
  const out: FlatBundlesByNamespace = {};
  for (const [filePath, dict] of Object.entries(rawBundles)) {
    const ns = namespaceOf(filePath);
    if (!ns) continue;
    out[ns] = flatten(dict);
  }
  return out;
}

let cachedCatalog: TranslationKeyInfo[] | null = null;
let cachedFlatId: FlatBundlesByNamespace | null = null;
let cachedFlatEn: FlatBundlesByNamespace | null = null;

function getFlatBundles() {
  if (!cachedFlatId) cachedFlatId = buildFlatBundles(idBundles);
  if (!cachedFlatEn) cachedFlatEn = buildFlatBundles(enBundles);
  return { id: cachedFlatId, en: cachedFlatEn };
}

export function getDefaultBundles(): { id: FlatBundlesByNamespace; en: FlatBundlesByNamespace } {
  return getFlatBundles();
}

export function getAllTranslationKeys(): TranslationKeyInfo[] {
  if (cachedCatalog) return cachedCatalog;

  const { id: flatId, en: flatEn } = getFlatBundles();
  const namespaces = new Set([...Object.keys(flatId), ...Object.keys(flatEn)]);

  const items: TranslationKeyInfo[] = [];
  for (const ns of namespaces) {
    const idDict = flatId[ns] ?? {};
    const enDict = flatEn[ns] ?? {};
    const paths = new Set([...Object.keys(idDict), ...Object.keys(enDict)]);
    for (const path of paths) {
      items.push({
        key: `${ns}:${path}`,
        namespace: ns,
        path,
        id: idDict[path] ?? '',
        en: enDict[path] ?? '',
      });
    }
  }

  items.sort((a, b) => a.key.localeCompare(b.key));
  cachedCatalog = items;
  return items;
}

// ----------------------------------------------------------------------
// Helpers untuk lookup default value per (lang, key)
// ----------------------------------------------------------------------

export function getDefaultValue(lang: 'id' | 'en', fullKey: string): string {
  const [ns, ...rest] = fullKey.split(':');
  if (!ns || rest.length === 0) return '';
  const path = rest.join(':');
  const bundles = getFlatBundles();
  return bundles[lang][ns]?.[path] ?? '';
}
