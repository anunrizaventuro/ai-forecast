import type { NavItemDataProps } from '../types';

import { useEffect, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { isEqualPath, isActiveLink, isExternalLink } from 'minimal-shared/utils';

import Collapse from '@mui/material/Collapse';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { NavItem } from './nav-mobile-item';
import { NavLi, NavUl } from '../components';

// ----------------------------------------------------------------------

const linkProps = (path: string) =>
  isExternalLink(path)
    ? { component: 'a' as const, href: path, target: '_blank', rel: 'noopener' }
    : { component: RouterLink, href: path };

export function NavList({ data }: { data: NavItemDataProps }) {
  const pathname = usePathname();

  const hasChild = !!data.children?.length;
  const isActive = isActiveLink(pathname, data.path, hasChild);

  const { value: open, onToggle, onFalse } = useBoolean(isActive && hasChild);

  // Collapse open menus when the route changes.
  useEffect(() => {
    onFalse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleToggle = useCallback(() => {
    if (hasChild) onToggle();
  }, [hasChild, onToggle]);

  const renderItem = () =>
    hasChild ? (
      <NavItem
        title={data.title}
        hasChild
        open={open}
        active={isActive}
        aria-expanded={open}
        onClick={handleToggle}
      />
    ) : (
      <NavItem title={data.title} active={isActive} {...linkProps(data.path)} />
    );

  return (
    <NavLi>
      {renderItem()}

      {hasChild && (
        <Collapse in={open}>
          <NavUl sx={{ gap: 0.5, mt: 0.5 }}>
            {data.children?.map((child) => (
              <NavLi key={child.title}>
                <NavItem
                  subItem
                  title={child.title}
                  active={child.path !== '#' && isEqualPath(child.path, pathname)}
                  {...linkProps(child.path)}
                />
              </NavLi>
            ))}
          </NavUl>
        </Collapse>
      )}
    </NavLi>
  );
}
