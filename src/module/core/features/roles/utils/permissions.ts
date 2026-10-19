// ----------------------------------------------------------------------
// Permission resource catalog (synced with BE actual permissions)
// Source: GET /core/v1/auth/me .permissions array (administrator role)
// ----------------------------------------------------------------------

export type PermissionGroup = {
  id: 'core' | 'audit';
  resources: string[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'core',
    resources: [
      'roles',
      'user-management',
      'branches',
      'companies',
      'company_users',
      'translation_overrides',
    ],
  },
  {
    id: 'audit',
    resources: ['audit-log'],
  },
];

export const LEVEL_OPTIONS = ['viewer', 'editor', 'admin'] as const;
