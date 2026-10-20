import type { Theme, CSSObject } from '@mui/material/styles';
import type { SettingsState } from 'src/module/core/features/settings';

import { varAlpha } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

export function dashboardLayoutVars(theme: Theme) {
  return {
    '--layout-transition-easing': 'linear',
    '--layout-transition-duration': '120ms',
    '--layout-nav-mini-width': '88px',
    '--layout-nav-vertical-width': '300px',
    '--layout-nav-horizontal-height': '64px',
    '--layout-dashboard-content-pt': theme.spacing(2.5),
    '--layout-dashboard-content-pb': theme.spacing(8),
    '--layout-dashboard-content-px': theme.spacing(5),
  };
}

// ----------------------------------------------------------------------

const NAV_BRAND = {
  bgTop: '#0A4A57',
  bg: '#073A45',
  bgBottom: '#052B33',
  bgDark: '#052A32',
  bgDarkBottom: '#031B21',
  accent: '#F5B544',
};

export function dashboardNavColorVars(
  theme: Theme,
  navColor: SettingsState['navColor'] = 'integrate',
  navLayout: SettingsState['navLayout'] = 'vertical'
): Record<'layout' | 'section', CSSObject | undefined> {
  const {
    vars: { palette },
  } = theme;

  switch (navColor) {
    case 'integrate':
      return {
        layout: {
          '--layout-nav-bg': palette.background.default,
          '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.8),
          '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.12),
          '--layout-nav-text-primary-color': palette.text.primary,
          '--layout-nav-text-secondary-color': palette.text.secondary,
          '--layout-nav-text-disabled-color': palette.text.disabled,
          ...theme.applyStyles('dark', {
            '--layout-nav-border-color': varAlpha(palette.grey['500Channel'], 0.08),
            '--layout-nav-horizontal-bg': varAlpha(palette.background.defaultChannel, 0.96),
          }),
        },
        section: undefined,
      };
    case 'apparent':
      // Sidebar berwarna merek: petrol tua dari ikon AI Forecast (#007F96),
      // menu aktif ditandai kuning "kulit roti".
      return {
        layout: {
          '--layout-nav-bg': NAV_BRAND.bg,
          '--layout-nav-bg-image': `linear-gradient(180deg, ${NAV_BRAND.bgTop} 0%, ${NAV_BRAND.bg} 55%, ${NAV_BRAND.bgBottom} 100%)`,
          '--layout-nav-horizontal-bg': NAV_BRAND.bg,
          '--layout-nav-border-color': 'transparent',
          '--layout-nav-text-primary-color': palette.common.white,
          '--layout-nav-text-secondary-color': varAlpha(palette.common.whiteChannel, 0.64),
          '--layout-nav-text-disabled-color': varAlpha(palette.common.whiteChannel, 0.4),
          ...theme.applyStyles('dark', {
            '--layout-nav-bg': NAV_BRAND.bgDark,
            '--layout-nav-bg-image': `linear-gradient(180deg, ${NAV_BRAND.bg} 0%, ${NAV_BRAND.bgDark} 60%, ${NAV_BRAND.bgDarkBottom} 100%)`,
            '--layout-nav-horizontal-bg': NAV_BRAND.bgDark,
          }),
        },
        section: {
          // caption
          '--nav-item-caption-color': varAlpha(palette.common.whiteChannel, 0.48),
          // subheader
          '--nav-subheader-color': varAlpha(palette.common.whiteChannel, 0.48),
          '--nav-subheader-hover-color': palette.common.white,
          // item
          '--nav-item-color': varAlpha(palette.common.whiteChannel, 0.72),
          '--nav-item-hover-bg': varAlpha(palette.common.whiteChannel, 0.08),
          '--nav-item-root-active-color': NAV_BRAND.accent,
          '--nav-item-root-active-color-on-dark': NAV_BRAND.accent,
          '--nav-item-root-active-bg': varAlpha(palette.common.whiteChannel, 0.12),
          '--nav-item-root-active-hover-bg': varAlpha(palette.common.whiteChannel, 0.16),
          '--nav-item-root-active-shadow': `inset 3px 0 0 ${NAV_BRAND.accent}`,
          '--nav-item-root-open-color': palette.common.white,
          '--nav-item-root-open-bg': varAlpha(palette.common.whiteChannel, 0.08),
          // bullet
          '--nav-bullet-light-color': varAlpha(palette.common.whiteChannel, 0.24),
          '--nav-bullet-dark-color': varAlpha(palette.common.whiteChannel, 0.24),
          // sub
          '--nav-item-sub-active-color': palette.common.white,
          '--nav-item-sub-active-bg': varAlpha(palette.common.whiteChannel, 0.08),
          '--nav-item-sub-open-color': palette.common.white,
          '--nav-item-sub-open-bg': varAlpha(palette.common.whiteChannel, 0.08),
        },
      };
    default:
      throw new Error(`Invalid color: ${navColor}`);
  }
}
