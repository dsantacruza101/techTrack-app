import { useRef, useState, useEffect } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { Tag } from 'primereact/tag'
import { Avatar } from 'primereact/avatar'
import { Dropdown } from 'primereact/dropdown'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { userService } from '../features/auth/services/userService'
import { usePermissions } from '../features/auth/hooks/usePermissions'
import { useAuth } from '../contexts/AuthContext'
import type { UserProfile, Role } from '../features/auth/types/auth.types'

const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'User',       value: 'user' },
  { label: 'Admin',      value: 'admin' },
  { label: 'Super Admin', value: 'superAdmin' },
]

const ROLE_SEVERITY: Record<Role, 'info' | 'warning' | 'danger'> = {
  user:       'info',
  admin:      'warning',
  superAdmin: 'danger',
}

const ROLE_LABEL: Record<Role, string> = {
  user:       'User',
  admin:      'Admin',
  superAdmin: 'Super Admin',
}

const UsersPage = () => {
  const toast = useRef<Toast>(null)
  const [users, setUsers]   = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const { can } = usePermissions()
  const { userProfile: me } = useAuth()

  useEffect(() => {
    const unsub = userService.subscribeToAll((data) => {
      setUsers(data)
      setLoading(false)
    })
    return unsub
  }, [])

  const notify = (severity: 'success' | 'error', summary: string, detail: string) =>
    toast.current?.show({ severity, summary, detail, life: 3000 })

  // ── Mutations ──────────────────────────────────────────────────
  const handleToggleActive = (u: UserProfile) =>
    confirmDialog({
      message: u.isActive
        ? `Disable ${u.displayName || u.email}? They won't be able to sign in.`
        : `Re-enable ${u.displayName || u.email}?`,
      header: u.isActive ? 'Disable User' : 'Enable User',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: u.isActive ? 'tt-confirm-danger' : undefined,
      accept: async () => {
        const ok = await userService.setActive(u.uid, !u.isActive)
        notify(ok ? 'success' : 'error', ok ? 'Done' : 'Error',
          ok ? `${u.displayName || u.email} ${u.isActive ? 'disabled' : 'enabled'}.`
             : 'Something went wrong.')
      },
    })

  const handleDelete = (u: UserProfile) =>
    confirmDialog({
      message: `Permanently remove ${u.displayName || u.email}? This only removes the profile — their login account remains.`,
      header: 'Remove User Profile',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'tt-confirm-danger',
      accept: async () => {
        const ok = await userService.remove(u.uid)
        notify(ok ? 'success' : 'error', ok ? 'Removed' : 'Error',
          ok ? 'User profile removed.' : 'Something went wrong.')
      },
    })

  const handleRoleChange = async (u: UserProfile, role: Role) => {
    const ok = await userService.setRole(u.uid, role)
    if (!ok) notify('error', 'Error', 'Could not update role.')
  }

  // ── Column templates ───────────────────────────────────────────
  const userTemplate = (u: UserProfile) => {
    const initials = u.displayName
      ? u.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : u.email[0]?.toUpperCase() ?? '?'

    return (
      <div className="flex align-items-center gap-3">
        <Avatar
          label={initials}
          shape="circle"
          style={{
            background: 'rgba(79,143,255,0.15)',
            color: 'var(--primary-color)',
            fontFamily: "'DM Mono', monospace",
            fontSize: '12px',
            flexShrink: 0,
          }}
        />
        <div>
          <div className="font-medium text-sm" style={{ color: 'var(--text-color)' }}>
            {u.displayName || '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>{u.email}</div>
        </div>
      </div>
    )
  }

  const roleTemplate = (u: UserProfile) => {
    if (can('change_roles') && u.uid !== me?.uid) {
      return (
        <Dropdown
          value={u.role}
          options={ROLE_OPTIONS}
          onChange={(e) => handleRoleChange(u, e.value)}
          style={{ minWidth: '130px' }}
        />
      )
    }
    return <Tag value={ROLE_LABEL[u.role]} severity={ROLE_SEVERITY[u.role]} rounded />
  }

  const statusTemplate = (u: UserProfile) => (
    <Tag
      value={u.isActive ? 'Active' : 'Disabled'}
      severity={u.isActive ? 'success' : 'secondary'}
      rounded
    />
  )

  const actionsTemplate = (u: UserProfile) => {
    const isSelf = u.uid === me?.uid
    return (
      <div className="flex gap-1 justify-content-end">
        {can('disable_users') && !isSelf && (
          <Button
            icon={u.isActive ? 'pi pi-ban' : 'pi pi-check'}
            size="small"
            severity={u.isActive ? 'warning' : 'success'}
            text
            rounded
            tooltip={u.isActive ? 'Disable' : 'Enable'}
            tooltipOptions={{ position: 'top' }}
            onClick={() => handleToggleActive(u)}
          />
        )}
        {can('delete_users') && !isSelf && (
          <Button
            icon="pi pi-trash"
            size="small"
            severity="danger"
            text
            rounded
            tooltip="Remove Profile"
            tooltipOptions={{ position: 'top' }}
            onClick={() => handleDelete(u)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-column gap-4">
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold m-0">Users</h2>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-color-secondary)' }}>
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </p>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <DataTable
        value={users}
        loading={loading}
        emptyMessage="No users found."
        stripedRows
        showGridlines={false}
        style={{ borderRadius: '12px', overflow: 'hidden' }}
      >
        <Column header="User"   body={userTemplate}    style={{ minWidth: 240 }} />
        <Column header="Role"   body={roleTemplate}    style={{ minWidth: 160 }} />
        <Column header="Status" body={statusTemplate}  style={{ width: 110 }} />
        <Column header=""       body={actionsTemplate} style={{ width: 100 }} align="right" />
      </DataTable>

    </div>
  )
}

export default UsersPage
