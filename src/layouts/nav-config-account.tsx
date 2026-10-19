import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

type AccountNavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  info?: React.ReactNode;
};

export const _account: AccountNavItem[] = [
  { label: 'Home', href: '/', icon: <Iconify icon="solar:home-angle-bold-duotone" /> },
  {
    label: 'Profile',
    href: '#',
    icon: <Iconify icon="custom:profile-duotone" />,
  },
  {
    label: 'Projects',
    href: '#',
    icon: <Iconify icon="solar:notes-bold-duotone" />,
    info: '3',
  },
  {
    label: 'Subscription',
    href: '#',
    icon: <Iconify icon="custom:invoice-duotone" />,
  },
  { label: 'Security', href: '#', icon: <Iconify icon="solar:shield-keyhole-bold-duotone" /> },
  { label: 'Account settings', href: '#', icon: <Iconify icon="solar:settings-bold-duotone" /> },
];
