import type { NavSectionProps } from 'src/shared/ui/nav-section';
import type { NavItemDataProps } from 'src/shared/ui/nav-section/types';

import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/shared/config';
import { SvgColor } from 'src/shared/ui/svg-color';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  dashboard: icon('ic-dashboard'),
  recommendation: icon('ic-order'),
  salesAnalysis: icon('ic-analytics'),
  stores: icon('ic-ecommerce'),
  products: icon('ic-product'),
  dataImport: icon('ic-file'),
  settings: icon('ic-params'),
};

// ----------------------------------------------------------------------

/**
 * Recursively filter nav items by the user's permissions.
 *
 * Rules:
 * - If item has no `permission` / `permissionAny`, it stays.
 * - Leaf with `permission`: drop if user can't read.
 * - Parent with `children`: filter children first; drop parent if no child remains
 *   (unless it has its own gate that the user passes).
 */
function filterNav(
  items: NavItemDataProps[],
  can: (k: string) => boolean,
  canAny: (k: string[]) => boolean
): NavItemDataProps[] {
  return items
    .map((item): NavItemDataProps | null => {
      const hasGate = !!item.permission || !!item.permissionAny;
      const passesGate =
        !hasGate ||
        (item.permission ? can(item.permission) : false) ||
        (item.permissionAny ? canAny(item.permissionAny) : false);

      if (item.children && item.children.length > 0) {
        const filteredChildren = filterNav(item.children, can, canAny);
        if (filteredChildren.length === 0) {
          // Hide parent if no children survive AND it doesn't have its own
          // standalone permission that the user passes
          return passesGate && hasGate ? { ...item, children: undefined } : null;
        }
        return { ...item, children: filteredChildren };
      }

      return passesGate ? item : null;
    })
    .filter((it): it is NavItemDataProps => it !== null);
}

// ----------------------------------------------------------------------

export function useNavData(): NavSectionProps['data'] {
  const { can, canAny } = usePermission();

  return useMemo(() => {
    const sections: NavSectionProps['data'] = [
      {
        // Label forecast ditulis langsung (Bahasa Indonesia saja, tanpa i18n).
        items: [
          { title: 'Dashboard', path: paths.dashboard.root, icon: ICONS.dashboard },
          {
            title: 'Rekomendasi Stok',
            path: paths.dashboard.recommendation,
            icon: ICONS.recommendation,
          },
          {
            title: 'Analisis Penjualan',
            path: paths.dashboard.salesAnalysis,
            icon: ICONS.salesAnalysis,
          },
          { title: 'Data Toko', path: paths.dashboard.stores, icon: ICONS.stores },
          { title: 'Data Produk', path: paths.dashboard.products, icon: ICONS.products },
          { title: 'Import Data', path: paths.dashboard.dataImport, icon: ICONS.dataImport },
          { title: 'Pengaturan', path: paths.dashboard.settings, icon: ICONS.settings },
        ],
      },
    ];

    // Apply permission filter to each section, then drop empty sections
    return sections
      .map((section) => ({ ...section, items: filterNav(section.items, can, canAny) }))
      .filter((section) => section.items.length > 0);
  }, [can, canAny]);
}
