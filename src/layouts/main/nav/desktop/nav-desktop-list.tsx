import type { NavItemDataProps } from '../types';

import { useId, useRef, useState, useEffect, useCallback } from 'react';
import { isEqualPath, isActiveLink, isExternalLink } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { NavItem } from './nav-desktop-item';

// ----------------------------------------------------------------------

const linkProps = (path: string) =>
  isExternalLink(path)
    ? { component: 'a' as const, href: path, target: '_blank', rel: 'noopener' }
    : { component: RouterLink, href: path };

export function NavList({ data }: { data: NavItemDataProps }) {
  const pathname = usePathname();
  const menuId = useId();

  const anchorRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedByKeyboard = useRef(false);

  const hasChild = !!data.children?.length;
  const isActive = isActiveLink(pathname, data.path, hasChild);

  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
    if (hasChild) setOpen(true);
  }, [hasChild]);

  const handleClose = useCallback(() => {
    setOpen(false);
    openedByKeyboard.current = false;
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!hasChild) return;

      if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        openedByKeyboard.current = true;
        setOpen(true);
      } else if (event.key === 'Escape') {
        handleClose();
      }
    },
    [hasChild, handleClose]
  );

  // Leaf item — a plain link.
  if (!hasChild) {
    return (
      <Box component="li" sx={{ display: 'inline-flex' }}>
        <NavItem title={data.title} active={isActive} {...linkProps(data.path)} />
      </Box>
    );
  }

  // Parent item — accessible dropdown (hover + click + keyboard).
  return (
    <Box
      ref={anchorRef}
      component="li"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      sx={{ display: 'inline-flex' }}
    >
      <NavItem
        ref={triggerRef}
        title={data.title}
        hasChild
        open={open}
        active={isActive}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      />

      <Popover
        id={menuId}
        open={open}
        anchorEl={anchorRef.current}
        onClose={handleClose}
        disableScrollLock
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          // Let the page under the popover stay hoverable (so moving between
          // top-level items feels natural); only the paper captures pointers.
          root: { sx: { pointerEvents: 'none' } },
          paper: {
            onMouseEnter: handleOpen,
            onMouseLeave: handleClose,
            // Flush under the trigger (no dead-zone gap that would drop the hover).
            sx: { minWidth: 180, pointerEvents: 'auto' },
          },
        }}
      >
        <MenuList
          autoFocusItem={open && openedByKeyboard.current}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              handleClose();
              triggerRef.current?.focus();
            }
          }}
        >
          {data.children?.map((child) => (
            <MenuItem
              key={child.title}
              selected={child.path !== '#' && isEqualPath(child.path, pathname)}
              onClick={handleClose}
              {...linkProps(child.path)}
            >
              {child.title}
            </MenuItem>
          ))}
        </MenuList>
      </Popover>
    </Box>
  );
}
