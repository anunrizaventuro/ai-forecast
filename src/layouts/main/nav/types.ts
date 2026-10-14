import type { Theme, SxProps } from '@mui/material/styles';

// ----------------------------------------------------------------------

/**
 * Nav data model — the single source of truth is `navData` in
 * src/layouts/nav-config-main.tsx. A top item is one object; a dropdown adds a
 * flat `children` array. No component edits are needed to change menu content.
 */
export type NavSubItemProps = {
  title: string;
  path: string;
};

export type NavItemDataProps = {
  title: string;
  path: string;
  icon?: React.ReactNode;
  children?: NavSubItemProps[];
};

export type NavMainProps = {
  sx?: SxProps<Theme>;
  data: NavItemDataProps[];
};
