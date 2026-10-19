import type { Theme, SxProps } from '@mui/material/styles';
import type { TypographyProps } from '@mui/material/Typography';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

type Props = {
  /** Optional — a page may lead with the back arrow alone while it loads. */
  title?: string;
  /** Detail pages usually want a smaller heading than a list page. */
  titleVariant?: TypographyProps['variant'];
  subtitle?: string;
  /** Renders a back arrow on the same line as the title. */
  backHref?: string;
  /** Tooltip / screen-reader label for the back arrow (defaults to "Back"). */
  backLabel?: string;
  action?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export function PageHeader({
  title,
  titleVariant = 'h4',
  subtitle,
  backHref,
  backLabel,
  action,
  sx,
}: Props) {
  const { t: tCommon } = useTranslate('common');

  const label = backLabel ?? tCommon('actions.back');

  return (
    <Box sx={[{ mb: 3 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {backHref && (
            <Tooltip title={label}>
              {/**
               * Ghost icon button, not a filled pill: going back is a tertiary
               * action and should not carry the same weight as the record name.
               * The negative margin pulls the glyph out to the container edge so
               * the arrow — not its padding — lines up with the content below.
               */}
              <IconButton
                component={RouterLink}
                href={backHref}
                aria-label={label}
                sx={{ ml: -1, flexShrink: 0, color: 'text.secondary' }}
              >
                <Iconify icon="eva:arrow-ios-back-fill" width={22} />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography variant={titleVariant} noWrap>
                {title}
              </Typography>
            )}
            {subtitle && (
              // Tidak `noWrap` seperti skeleton: deskripsi halaman forecast satu kalimat penuh.
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {action}
      </Stack>
    </Box>
  );
}
