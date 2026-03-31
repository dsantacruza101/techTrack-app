export type Role = 'superAdmin' | 'admin' | 'user'

export type Permission =
  | 'add_asset'
  | 'edit_asset'
  | 'delete_asset'
  | 'replicate_asset'
  | 'export_csv'
  | 'manage_categories'
  | 'invite_users'
  | 'disable_users'
  | 'change_roles'
  | 'delete_users'
  | 'create_super_admin'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: Role
  isActive: boolean
  permissions: Permission[]
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
