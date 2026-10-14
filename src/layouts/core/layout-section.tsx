'use client';

import type { Theme, SxProps, CSSObject } from '@mui/material/styles';

import { mergeClasses } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';

import { layoutClasses } from './classes';
import { layoutSectionVars } from './css-vars';

// ----------------------------------------------------------------------

export type LayoutSectionProps = React.ComponentProps<'div'> & {
  sx?: SxProps<Theme>;
  cssVars?: CSSObject;
  children?: React.ReactNode;
  footerSection?: React.ReactNode;
  headerSection?: React.ReactNode;
  sidebarSection?: React.ReactNode;
};

export function LayoutSection({
  sx,
  cssVars,
  children,
  footerSection,
  headerSection,
  sidebarSection,
  className,
  ...other
}: LayoutSectionProps) {
  const inputGlobalStyles = (
    <GlobalStyles styles={(theme) => ({ body: { ...layoutSectionVars(theme), ...cssVars } })} />
  );

  return (
    <>
      {inputGlobalStyles}

      <LayoutRoot
        id="root__layout"
        className={mergeClasses([layoutClasses.root, className])}
        sx={sx}
        {...other}
      >
        <SkipLink href="#main-content">Lewati ke konten utama</SkipLink>
        {headerSection}
        {children}
        {footerSection}
      </LayoutRoot>
    </>
  );
}

// ----------------------------------------------------------------------

const LayoutRoot = styled('div')``;

// Tersembunyi sampai menerima fokus keyboard (Tab pertama di halaman).
const SkipLink = styled('a')(({ theme }) => ({
  ...theme.typography.subtitle2,
  position: 'fixed',
  top: theme.spacing(1),
  left: theme.spacing(1),
  zIndex: theme.zIndex.tooltip + 1,
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  color: theme.vars.palette.common.white,
  backgroundColor: theme.vars.palette.grey[900],
  transform: 'translateY(-200%)',
  '&:focus-visible': { transform: 'translateY(0)' },
}));
