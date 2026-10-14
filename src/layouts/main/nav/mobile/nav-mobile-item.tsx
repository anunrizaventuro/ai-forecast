import type { ButtonBaseProps } from '@mui/material/ButtonBase';

import { varAlpha } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type NavItemProps = ButtonBaseProps & {
  title: string;
  open?: boolean;
  active?: boolean;
  subItem?: boolean;
  hasChild?: boolean;
};

export function NavItem({ title, open, active, subItem, hasChild, ...other }: NavItemProps) {
  return (
    <ItemRoot disableRipple active={active} open={open} subItem={subItem} {...other}>
      <ItemTitle>{title}</ItemTitle>
      {hasChild && (
        <Iconify
          width={16}
          icon={open ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
        />
      )}
    </ItemRoot>
  );
}

// ----------------------------------------------------------------------

type StyledState = { open?: boolean; active?: boolean; subItem?: boolean };

const shouldForwardProp = (prop: string) => !['open', 'active', 'subItem'].includes(prop);

const ItemRoot = styled(ButtonBase, { shouldForwardProp })<StyledState>(({ theme }) => ({
  width: '100%',
  minHeight: 44,
  gap: theme.spacing(2),
  justifyContent: 'flex-start',
  padding: theme.spacing(0, 1.5, 0, 2),
  borderRadius: `${theme.shape.borderRadius}px`,
  color: theme.vars.palette.text.primary,
  ...theme.typography.body2,
  fontWeight: theme.typography.fontWeightMedium,
  transition: theme.transitions.create(['color', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': { backgroundColor: theme.vars.palette.action.hover },
  variants: [
    {
      props: { subItem: true },
      style: {
        minHeight: 36,
        paddingLeft: theme.spacing(4),
        color: theme.vars.palette.text.secondary,
        fontWeight: theme.typography.fontWeightRegular,
      },
    },
    { props: { open: true }, style: { backgroundColor: theme.vars.palette.action.hover } },
    {
      props: { active: true },
      style: {
        color: theme.vars.palette.primary.main,
        fontWeight: theme.typography.fontWeightSemiBold,
        backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
        '&:hover': { backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16) },
      },
    },
  ],
}));

const ItemTitle = styled('span')(() => ({
  flex: '1 1 auto',
  textAlign: 'left',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));
