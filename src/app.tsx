import 'src/global.css';

import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/shared/config';
import { Snackbar } from 'src/shared/ui/snackbar';
import { themeConfig, ThemeProvider } from 'src/theme';
import { ProgressBar } from 'src/shared/ui/progress-bar';
import { MotionLazy } from 'src/shared/ui/animate/motion-lazy';
import { I18nProvider, LocalizationProvider } from 'src/locales';
import { AuthProvider } from 'src/module/core/features/auth/context/jwt';
import { OnboardingDialog } from 'src/module/core/features/auth/components/onboarding-dialog';
import {
  SettingsDrawer,
  defaultSettings,
  SettingsProvider,
} from 'src/module/core/features/settings';
import { TranslationOverrideSync } from 'src/module/core/features/translation-override/components/translation-override-sync';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();

  return (
    <I18nProvider>
      <AuthProvider>
        <SettingsProvider defaultSettings={defaultSettings}>
          <ThemeProvider
            modeStorageKey={themeConfig.modeStorageKey}
            defaultMode={themeConfig.defaultMode}
          >
            <LocalizationProvider>
              <MotionLazy>
                <ProgressBar />
                <Snackbar />
                <SettingsDrawer defaultSettings={defaultSettings} />
                {/* Modul core skeleton dimatikan selama auth di-skip (tanpa backend /core/v1). */}
                {!CONFIG.auth.skip && <OnboardingDialog />}
                {!CONFIG.auth.skip && <TranslationOverrideSync />}
                {children}
              </MotionLazy>
            </LocalizationProvider>
          </ThemeProvider>
        </SettingsProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
