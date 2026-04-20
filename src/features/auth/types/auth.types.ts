export type Role = 'superAdmin' | 'admin' | 'user' | 'demo'

export type Permission =
  // Assets
  | 'add_asset'
  | 'edit_asset'
  | 'delete_asset'
  | 'replicate_asset'
  | 'export_csv'
  // Categories
  | 'manage_categories'
  // Users
  | 'invite_users'
  | 'disable_users'
  | 'change_roles'
  | 'delete_users'
  | 'create_super_admin'
  // Preventive Care
  | 'log_care'
  | 'manage_care_tasks'
  // Work Orders
  | 'create_work_order'
  | 'edit_work_order'
  | 'delete_work_order'
  | 'update_wo_status'
  // IT Tickets
  | 'submit_it_ticket'
  | 'manage_it_tickets'
  // Inventory
  | 'log_inventory'
  | 'manage_inventory'
  // Facility Map
  | 'edit_map'
  // Finance & Reports
  | 'view_finance'
  | 'view_reports'
  // Settings
  | 'manage_settings'
  | 'manage_integrations'
  | 'import_data'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: Role
  isActive: boolean
  permissions: Permission[]
}

/** A user registered by an admin but who has not yet signed in with Google. */
export interface PendingUser {
  id: string
  email: string
  displayName: string
  role: Role
  createdAt: number
}

export class AccountDisabledError extends Error {
  constructor() {
    super('This account has been disabled. Contact your administrator.')
    this.name = 'AccountDisabledError'
  }
}

export class AccountNotRegisteredError extends Error {
  constructor() {
    super('Your account is not registered. Contact your administrator to get access.')
    this.name = 'AccountNotRegisteredError'
  }
}
