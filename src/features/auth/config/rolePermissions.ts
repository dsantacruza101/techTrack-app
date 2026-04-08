import type { Permission, Role } from '../types/auth.types'

/**
 * Baseline permissions granted to each role.
 * Individual users can be extended via the permissions[] field in Firestore.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superAdmin: [
    // Assets
    'add_asset', 'edit_asset', 'delete_asset', 'replicate_asset', 'export_csv',
    // Categories
    'manage_categories',
    // Users
    'invite_users', 'disable_users', 'change_roles', 'delete_users', 'create_super_admin',
    // Care
    'log_care', 'manage_care_tasks',
    // Work Orders
    'create_work_order', 'edit_work_order', 'delete_work_order', 'update_wo_status',
    // IT
    'submit_it_ticket', 'manage_it_tickets',
    // Inventory
    'log_inventory', 'manage_inventory',
    // Map
    'edit_map',
    // Finance & Reports
    'view_finance', 'view_reports',
    // Settings
    'manage_settings', 'manage_integrations', 'import_data',
  ],
  admin: [
    // Assets
    'add_asset', 'edit_asset', 'delete_asset', 'replicate_asset', 'export_csv',
    // Categories
    'manage_categories',
    // Users
    'invite_users', 'disable_users',
    // Care
    'log_care', 'manage_care_tasks',
    // Work Orders
    'create_work_order', 'edit_work_order', 'delete_work_order', 'update_wo_status',
    // IT
    'submit_it_ticket', 'manage_it_tickets',
    // Inventory
    'log_inventory', 'manage_inventory',
    // Map
    'edit_map',
    // Finance & Reports
    'view_finance', 'view_reports',
    // Settings (category manager + care editor + export only)
    'manage_settings',
  ],
  user: [
    'log_care',
    'create_work_order',
    'update_wo_status',
    'submit_it_ticket',
    'log_inventory',
  ],
}
