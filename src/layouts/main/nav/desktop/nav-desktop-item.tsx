import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type NavItemProps = ButtonBaseProps & {
  title: string;
  open?: boolean;
  active?: boolean;
  hasChild?: boolean;
};

export function NavItem({ title, open, active, hasChild, ...other }: NavItemProps) {
  return (
    <ItemRoot disableRipple aria-label={title} active={active} open={open} {...other}>
      {title}
      {hasChild && <ItemArrow open={open} icon="eva:arrow-ios-downward-fill" />}
    </ItemRoot>
  );
}

// ----------------------------------------------------------------------

type StyledState = { open?: boolean; active?: boolean };

const shouldForwardProp = (prop: string) => !['open', 'active'].includes(prop);

const ItemRoot = styled(ButtonBase, { shouldForwardProp })<StyledState>(({ theme }) => ({
  height: 34,
  gap: theme.spacing(0.5),
  paddingInline: theme.spacing(1),
  borderRadius: `${theme.shape.borderRadius}px`,
  color: theme.vars.palette.text.primary,
  ...theme.typography.body2,
  fontWeight: theme.typography.fontWeightMedium,
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': { backgroundColor: theme.vars.palette.action.hover },
  '&:focus-visible': {
    outline: `2px solid ${theme.vars.palette.text.primary}`,
    outlineOffset: 2,
  },
  variants: [
    {
      props: { active: true },
      style: {
        color: theme.vars.palette.primary.main,
        fontWeight: theme.typography.fontWeightSemiBold,
      },
    },
    {
      props: { open: true },
      style: {
        color: theme.vars.palette.primary.main,
        backgroundColor: theme.vars.palette.action.hover,
      },
    },
  ],
}));

const ItemArrow = styled(Iconify, { shouldForwardProp })<StyledState>(({ theme }) => ({
  width: 16,
  height: 16,
  transition: theme.transitions.create(['transform'], {
    duration: theme.transitions.duration.shorter,
  }),
  variants: [{ props: { open: true }, style: { transform: 'rotate(-180deg)' } }],
}));
