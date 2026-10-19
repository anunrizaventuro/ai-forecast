import type { BoxProps } from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps } from 'src/shared/ui/nav-section';

import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { varAlpha } from 'minimal-shared/utils';
import { useBoolean } from 'minimal-shared/hooks';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import MenuList from '@mui/material/MenuList';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog, { dialogClasses } from '@mui/material/Dialog';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';

import { useRouter } from 'src/routes/hooks';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { SearchNotFound } from 'src/shared/ui/search-not-found';

import { ResultItem } from './result-item';
import { applyFilter, flattenNavSections } from './utils';

// ----------------------------------------------------------------------

export type SearchbarProps = BoxProps & {
  data?: NavSectionProps['data'];
};

const breakpoint: Breakpoint = 'sm';

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    '';
  return /mac|iphone|ipad|ipod/i.test(platform);
};

export function Searchbar({ data: navItems = [], sx, ...other }: SearchbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const smUp = useMediaQuery(theme.breakpoints.up(breakpoint));

  const { value: open, onFalse: onClose, onTrue: onOpen, onToggle } = useBoolean();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const shortcutLabel = useMemo(() => (isMacPlatform() ? '⌘K' : 'Ctrl K'), []);

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
  }, [onClose]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onToggle();
        setSearchQuery('');
      }
    },
    [onToggle]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const formattedNavItems = flattenNavSections(navItems);

  const dataFiltered = useMemo(
    () =>
      applyFilter({
        inputData: formattedNavItems,
        query: searchQuery,
      }),
    [formattedNavItems, searchQuery]
  );

  const notFound = searchQuery && !dataFiltered.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!dataFiltered.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % dataFiltered.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + dataFiltered.length) % dataFiltered.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = dataFiltered[activeIndex];
        if (!target) return;
        handleClose();
        router.push(target.path);
      }
    },
    [activeIndex, dataFiltered, handleClose, router]
  );

  const renderButton = () => (
    <Box
      onClick={onOpen}
      sx={[
        {
          display: 'flex',
          alignItems: 'center',
          [theme.breakpoints.up(breakpoint)]: {
            pr: 1,
            borderRadius: 1.5,
            cursor: 'pointer',
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
            transition: theme.transitions.create('background-color', {
              easing: theme.transitions.easing.easeInOut,
              duration: theme.transitions.duration.shortest,
            }),
            '&:hover': {
              bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        component={smUp ? 'span' : IconButton}
        sx={{
          [theme.breakpoints.up(breakpoint)]: {
            p: 1,
            display: 'inline-flex',
            color: 'action.active',
          },
        }}
      >
        <Iconify icon="eva:search-fill" />
      </Box>

      <Label
        sx={{
          color: 'grey.800',
          cursor: 'inherit',
          bgcolor: 'common.white',
          fontSize: theme.typography.pxToRem(12),
          boxShadow: theme.vars.customShadows.z1,
          display: { xs: 'none', [breakpoint]: 'inline-flex' },
        }}
      >
        {shortcutLabel}
      </Label>
    </Box>
  );

  const renderResults = () => (
    <MenuList
      disablePadding
      sx={{
        [`& .${menuItemClasses.root}`]: {
          p: 0,
          mb: 0,
          '&:hover': { bgcolor: 'transparent' },
        },
      }}
    >
      {dataFiltered.map((item, index) => {
        const matchesTitle = match(item.title, searchQuery, { insideWords: true });
        const partsTitle = parse(item.title, matchesTitle);

        const matchesPath = match(item.path, searchQuery, { insideWords: true });
        const partsPath = parse(item.path, matchesPath);

        const isActive = index === activeIndex;

        return (
          <MenuItem disableRipple key={`${item.title}${item.path}`}>
            <ResultItem
              ref={(el: HTMLElement | null) => {
                itemRefs.current[index] = el;
              }}
              selected={isActive}
              path={partsPath}
              title={partsTitle}
              href={item.path}
              labels={item.group.split('.')}
              onClick={handleClose}
              onMouseEnter={() => setActiveIndex(index)}
            />
          </MenuItem>
        );
      })}
    </MenuList>
  );

  return (
    <>
      {renderButton()}

      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        transitionDuration={{ enter: theme.transitions.duration.shortest, exit: 100 }}
        sx={[
          {
            [`& .${dialogClasses.paper}`]: { mt: 15, overflow: 'unset' },
            [`& .${dialogClasses.container}`]: { alignItems: 'flex-start' },
          },
        ]}
      >
        <InputBase
          fullWidth
          autoFocus={open}
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearch}
          onKeyDown={handleInputKeyDown}
          startAdornment={
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" width={24} sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          endAdornment={<Label sx={{ letterSpacing: 1, color: 'text.secondary' }}>esc</Label>}
          inputProps={{ id: 'search-input' }}
          sx={{
            p: 3,
            borderBottom: `solid 1px ${theme.vars.palette.divider}`,
            [`& .${inputBaseClasses.input}`]: { typography: 'h6' },
          }}
        />

        {notFound ? (
          <SearchNotFound query={searchQuery} sx={{ py: 15, px: 2.5 }} />
        ) : (
          <Scrollbar sx={{ p: 2.5, height: 400 }}>{renderResults()}</Scrollbar>
        )}
      </Dialog>
    </>
  );
}
