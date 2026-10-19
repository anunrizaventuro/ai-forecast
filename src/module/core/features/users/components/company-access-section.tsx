import type { CompanyMembership } from 'src/module/core/features/auth/types';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

type CompanyTreeNode = {
  id: string;
  name: string;
  children: CompanyTreeNode[];
};

function buildCompanyTree(companies: CompanyMembership[]): CompanyTreeNode[] {
  const map = new Map<string, CompanyTreeNode>();
  const roots: CompanyTreeNode[] = [];

  for (const c of companies) {
    map.set(c.id, { id: c.id, name: c.name, children: [] });
  }
  for (const c of companies) {
    const node = map.get(c.id);
    if (!node) continue;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function filterTree(nodes: CompanyTreeNode[], query: string): CompanyTreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  return nodes
    .map((node): CompanyTreeNode | null => {
      const childMatches = filterTree(node.children, query);
      const selfMatches = node.name.toLowerCase().includes(q);
      if (selfMatches || childMatches.length > 0) {
        return {
          ...node,
          children: selfMatches ? node.children : childMatches,
        };
      }
      return null;
    })
    .filter((n): n is CompanyTreeNode => n !== null);
}

// ----------------------------------------------------------------------

type TreeItemProps = {
  node: CompanyTreeNode;
  checked: Set<string>;
  ownedCompanyIds: Set<string>;
  onToggle: (id: string) => void;
  level?: number;
};

function CompanyTreeItem({ node, checked, ownedCompanyIds, onToggle, level = 0 }: TreeItemProps) {
  const { t } = useTranslate('users');
  const hasChildren = node.children.length > 0;
  const isRoot = level === 0;
  const isOwned = ownedCompanyIds.has(node.id);

  return (
    <Box>
      <Tooltip title={isOwned ? t('form.companyOwnedHint') : ''} placement="right">
        <Box
          onClick={() => !isOwned && onToggle(node.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 0.75,
            px: 0.75,
            py: 0.5,
            cursor: isOwned ? 'not-allowed' : 'pointer',
            opacity: isOwned ? 0.7 : 1,
            '&:hover': isOwned ? undefined : { bgcolor: 'action.hover' },
          }}
        >
          <Checkbox
            size="small"
            checked={checked.has(node.id)}
            onChange={() => !isOwned && onToggle(node.id)}
            onClick={(e) => e.stopPropagation()}
            disabled={isOwned}
            sx={{ flexShrink: 0, p: 0.25 }}
          />
          <Typography
            variant="body2"
            sx={{
              pl: 0.75,
              lineHeight: 1.25,
              userSelect: 'none',
              fontWeight: isRoot ? 600 : 400,
              color: isRoot ? 'text.primary' : 'text.secondary',
            }}
          >
            {node.name}
          </Typography>
          {isOwned && (
            <Typography variant="caption" sx={{ color: 'warning.main', ml: 0.75 }}>
              ({t('form.companyOwnerLabel')})
            </Typography>
          )}
        </Box>
      </Tooltip>

      {hasChildren && (
        <Box sx={{ position: 'relative', mt: 1, ml: '7px', pl: '22px' }}>
          {node.children.map((child, index) => {
            const isLast = index === node.children.length - 1;
            return (
              <Box
                key={child.id}
                sx={{
                  position: 'relative',
                  mt: 1,
                  pt: index === 0 ? '2px' : 0,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    borderLeft: '1px solid',
                    borderColor: 'divider',
                    left: -22,
                    top: index === 0 ? -10 : -8,
                    height: isLast ? (index === 0 ? 24 : 22) : undefined,
                    bottom: isLast ? undefined : 0,
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    left: -22,
                    top: 14,
                    width: 22,
                  }}
                />
                <CompanyTreeItem
                  node={child}
                  checked={checked}
                  ownedCompanyIds={ownedCompanyIds}
                  onToggle={onToggle}
                  level={level + 1}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  companies: CompanyMembership[];
  checked: Set<string>;
  ownedCompanyIds: Set<string>;
  onToggle: (id: string) => void;
  error?: string | null;
};

export function CompanyAccessSection({
  companies,
  checked,
  ownedCompanyIds,
  onToggle,
  error,
}: Props) {
  const { t } = useTranslate('users');
  const [search, setSearch] = useState('');

  const tree = useMemo(() => buildCompanyTree(companies), [companies]);
  const filteredNodes = useMemo(() => filterTree(tree, search), [tree, search]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: 2,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle2">{t('form.companyAccess')}</Typography>

      <TextField
        fullWidth
        size="small"
        label={t('form.searchCompany')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Box
        sx={{
          p: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
        }}
      >
        {filteredNodes.map((node) => (
          <CompanyTreeItem
            key={node.id}
            node={node}
            checked={checked}
            ownedCompanyIds={ownedCompanyIds}
            onToggle={onToggle}
          />
        ))}
        {filteredNodes.length === 0 && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', py: 2 }}
          >
            {t('form.notFound')}
          </Typography>
        )}
      </Box>

      <Typography variant="caption" sx={{ color: error ? 'error.main' : 'text.secondary' }}>
        {error || t('form.companyAccessHint')}
      </Typography>
    </Box>
  );
}
