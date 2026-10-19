// ----------------------------------------------------------------------
// Centralized permission keys ("<resource>:<action>")
//
// Source: BE expansion of role level → actions
//   viewer  → read
//   editor  → read, create, update, delete
//   admin   → read, create, update, delete, export, import, restore
//   workflow resources also expose `:approve` (used for both Approve & Reject)
//
// Use these constants instead of inlining string literals in components,
// so renames are localized to this file.
// ----------------------------------------------------------------------

export const PERM = {
  // ---------- Core ----------
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  userManagement: {
    read: 'user-management:read',
    create: 'user-management:create',
    update: 'user-management:update',
    delete: 'user-management:delete',
  },
  branches: {
    read: 'branches:read',
    create: 'branches:create',
    update: 'branches:update',
    delete: 'branches:delete',
  },
  companies: {
    read: 'companies:read',
    create: 'companies:create',
    update: 'companies:update',
    delete: 'companies:delete',
  },
  companyUsers: {
    read: 'company_users:read',
    create: 'company_users:create',
    update: 'company_users:update',
    delete: 'company_users:delete',
  },
  translationOverrides: {
    read: 'translation_overrides:read',
    create: 'translation_overrides:create',
    update: 'translation_overrides:update',
    delete: 'translation_overrides:delete',
  },
  auditLog: {
    read: 'audit-log:read',
  },
} as const;
