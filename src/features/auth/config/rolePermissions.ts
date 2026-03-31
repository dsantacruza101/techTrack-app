import type { Permission, Role } from '../types/auth.types'

/**
 * Baseline permissions granted to each role.
 * Individual users can be extended via the permissions[] field in Firestore.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superAdmin: [
    'add_asset',
    'edit_asset',
    'delete_asset',
    'replicate_asset',
    'export_csv',
    'manage_categories',
    'invite_users',
    'disable_users',
    'change_roles',
    'delete_users',
    'create_super_admin',
  ],
  admin: [
    'add_asset',
    'edit_asset',
    'delete_asset',
    'replicate_asset',
    'export_csv',
    'manage_categories',
    'invite_users',
    'disable_users',
  ],
  user: [],
}
