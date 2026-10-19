import { useState, useCallback } from 'react';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

export function FullScreenButton() {
  const [fullscreen, setFullscreen] = useState(false);
  const { t } = useTranslate('settings');

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  return (
    <Tooltip title={fullscreen ? t('actions.exitFullscreen') : t('actions.fullscreen')}>
      <IconButton onClick={handleToggleFullscreen} color={fullscreen ? 'primary' : 'default'}>
        <Iconify
          icon={
            fullscreen
              ? 'solar:quit-full-screen-square-outline'
              : 'solar:full-screen-square-outline'
          }
        />
      </IconButton>
    </Tooltip>
  );
}
