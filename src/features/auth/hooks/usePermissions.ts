import { useAuth } from '../../../contexts/AuthContext'
import { ROLE_PERMISSIONS } from '../config/rolePermissions'
import type { Permission } from '../types/auth.types'

interface UsePermissionsReturn {
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canAll: (permissions: Permission[]) => boolean
}

/**
 * Checks permissions against the user's role baseline + individual permissions[].
 * Role sets the floor; the permissions array extends it per user. (OCP)
 *
 * Usage:
 *   const { can } = usePermissions()
 *   can('add_asset') → true | false
 */
export const usePermissions = (): UsePermissionsReturn => {
  const { role, userProfile } = useAuth()

  const can = (permission: Permission): boolean => {
    if (!role) return false
    const roleGrants = ROLE_PERMISSIONS[role] ?? []
    const userGrants = userProfile?.permissions ?? []
    return roleGrants.includes(permission) || userGrants.includes(permission)
  }

  const canAny = (permissions: Permission[]): boolean =>
    permissions.some(can)

  const canAll = (permissions: Permission[]): boolean =>
    permissions.every(can)

  return { can, canAny, canAll }
}
