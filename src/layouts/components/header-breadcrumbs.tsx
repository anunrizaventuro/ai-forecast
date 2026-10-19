import type { Theme, SxProps } from '@mui/material/styles';
import type { NavSectionProps, NavItemDataProps } from 'src/shared/ui/nav-section';

import { useMemo } from 'react';

import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

type Props = {
  data: NavSectionProps['data'];
  sx?: SxProps<Theme>;
};

type Crumb = {
  label: string;
  path?: string;
};

type Candidate = {
  trail: Crumb[];
  specificity: number; // longer matched path = more specific
};

function collectFromItems(
  items: NavItemDataProps[],
  pathname: string,
  ancestors: Crumb[]
): Candidate[] {
  const matches: Candidate[] = [];

  for (const item of items) {
    const hasRealPath = !!item.path && item.path !== '#';
    const isExact = hasRealPath && pathname === item.path;
    const isPrefix = hasRealPath && pathname.startsWith(`${item.path}/`);

    const itselfCrumb: Crumb = {
      label: item.title,
      path: hasRealPath ? item.path : undefined,
    };

    if (isExact || isPrefix) {
      matches.push({
        trail: [...ancestors, itselfCrumb],
        specificity: item.path!.length,
      });
    }

    if (item.children?.length) {
      matches.push(...collectFromItems(item.children, pathname, [...ancestors, itselfCrumb]));
    }
  }

  return matches;
}

export function HeaderBreadcrumbs({ data, sx }: Props) {
  const pathname = usePathname();

  const crumbs = useMemo<Crumb[]>(() => {
    const candidates: Candidate[] = [];
    for (const group of data) {
      // If the group has a subheader, use it as the trail root (non-clickable label).
      const ancestors: Crumb[] = group.subheader ? [{ label: group.subheader }] : [];
      candidates.push(...collectFromItems(group.items, pathname, ancestors));
    }

    if (candidates.length === 0) return [];

    // Pick the deepest matched path.
    candidates.sort((a, b) => b.specificity - a.specificity);
    return candidates[0].trail;
  }, [data, pathname]);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumbs
      separator={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
      sx={[
        {
          minWidth: 0,
          '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' },
          '& .MuiBreadcrumbs-li': { minWidth: 0 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        if (isLast || !crumb.path) {
          return (
            <Typography
              key={`${crumb.label}-${index}`}
              variant="body2"
              noWrap
              sx={{
                color: isLast ? 'text.primary' : 'text.secondary',
                fontWeight: isLast ? 600 : 400,
              }}
            >
              {crumb.label}
            </Typography>
          );
        }
        return (
          <Link
            key={`${crumb.label}-${index}`}
            component={RouterLink}
            href={crumb.path}
            variant="body2"
            color="inherit"
            underline="hover"
            sx={{ color: 'text.secondary' }}
            noWrap
          >
            {crumb.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
