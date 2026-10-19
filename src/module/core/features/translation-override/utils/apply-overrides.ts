import i18n from 'i18next';

import { supportedLngs } from 'src/locales/locales-config';

import { getDefaultBundles } from './translation-keys';

// ----------------------------------------------------------------------
// Apply a flat translation-override map to i18next so admins see a live
// preview after saving a custom value.
//
// `overrides` shape: `{ '<namespace>:<dotted.path>': value, ... }`
//
// Strategy: rebuild every namespace bundle per-locale = defaults overlaid
// with the deepified override values, then `addResourceBundle(deep, overwrite)`.
// Replacing the whole bundle is safe because i18next stores per-namespace.
// `i18n.emit('languageChanged', current)` retriggers Trans / useTranslation
// subscribers without changing the actual language.
// ----------------------------------------------------------------------

type FlatBundlesByNamespace = Record<string, Record<string, string>>;
type DeepBundle = Record<string, unknown>;

function setDeep(target: DeepBundle, dottedPath: string, value: string) {
  const parts = dottedPath.split('.');
  let cursor: DeepBundle = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    const existing = cursor[key];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as DeepBundle;
  }
  cursor[parts[parts.length - 1]] = value;
}

function flatToDeep(flat: Record<string, string>): DeepBundle {
  const out: DeepBundle = {};
  for (const [path, value] of Object.entries(flat)) {
    setDeep(out, path, value);
  }
  return out;
}

function groupOverridesByNamespace(
  overrides: Record<string, string>
): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, string>> = {};
  for (const [fullKey, value] of Object.entries(overrides)) {
    const sep = fullKey.indexOf(':');
    if (sep <= 0) continue;
    const ns = fullKey.slice(0, sep);
    const path = fullKey.slice(sep + 1);
    if (!path) continue;
    (grouped[ns] ??= {})[path] = value;
  }
  return grouped;
}

function applyForLocale(
  lng: string,
  defaults: FlatBundlesByNamespace,
  groupedOverrides: Record<string, Record<string, string>>
) {
  const namespaces = new Set([...Object.keys(defaults), ...Object.keys(groupedOverrides)]);
  for (const ns of namespaces) {
    const merged = { ...(defaults[ns] ?? {}), ...(groupedOverrides[ns] ?? {}) };
    i18n.addResourceBundle(lng, ns, flatToDeep(merged), true /* deep */, true /* overwrite */);
  }
}

export function applyOverridesToI18n(overrides: Record<string, string>) {
  const grouped = groupOverridesByNamespace(overrides);
  const { id: defaultsId, en: defaultsEn } = getDefaultBundles();

  for (const lng of supportedLngs) {
    const defaults = lng === 'id' ? defaultsId : defaultsEn;
    applyForLocale(lng, defaults, grouped);
  }

  // Force subscribers (Trans, useTranslation) to re-render with the new bundle.
  i18n.emit('languageChanged', i18n.language);
}

export function resetOverridesI18n() {
  applyOverridesToI18n({});
}
