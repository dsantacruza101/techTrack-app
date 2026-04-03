import { useRef, useState, useEffect } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Button } from 'primereact/button'
import { Toast } from 'primereact/toast'
import { Tag } from 'primereact/tag'
import { Avatar } from 'primereact/avatar'
import { Dropdown } from 'primereact/dropdown'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog'
import { userService } from '../features/auth/services/userService'
import { usePermissions } from '../features/auth/hooks/usePermissions'
import { useAuth } from '../contexts/AuthContext'
import type { UserProfile, PendingUser, Role } from '../features/auth/types/auth.types'

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

type TableRow = (UserProfile & { _pending: false }) | (PendingUser & { _pending: true })

const EMPTY_FORM = { displayName: '', email: '', role: 'user' as Role }

const UsersPage = () => {
  const toast = useRef<Toast>(null)
  const [users, setUsers]     = useState<UserProfile[]>([])
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const { can } = usePermissions()
  const { userProfile: me } = useAuth()

  useEffect(() => {
    let activeLoaded  = false
    let pendingLoaded = false
    const checkDone = () => { if (activeLoaded && pendingLoaded) setLoading(false) }

    const unsubActive  = userService.subscribeToAll((data) => {
      setUsers(data); activeLoaded = true; checkDone()
    })
    const unsubPending = userService.subscribeToPending((data) => {
      setPending(data); pendingLoaded = true; checkDone()
    })
    return () => { unsubActive(); unsubPending() }
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

  const handleDeletePending = (p: PendingUser) =>
    confirmDialog({
      message: `Cancel registration for ${p.displayName || p.email}?`,
      header: 'Cancel Registration',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'tt-confirm-danger',
      accept: async () => {
        const ok = await userService.removePending(p.id)
        notify(ok ? 'success' : 'error', ok ? 'Cancelled' : 'Error',
          ok ? 'Registration cancelled.' : 'Something went wrong.')
      },
    })

  const handleRoleChange = async (u: UserProfile, role: Role) => {
    const ok = await userService.setRole(u.uid, role)
    if (!ok) notify('error', 'Error', 'Could not update role.')
  }

  const handleAddUser = async () => {
    setSaving(true)
    const ok = await userService.registerByEmail(form)
    setSaving(false)
    if (ok) {
      notify('success', 'Registered', `${form.displayName || form.email} can now sign in with Google.`)
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    } else {
      notify('error', 'Error', 'Could not register user.')
    }
  }

  // admins cannot act on superAdmin accounts; only superAdmins can
  const canActOn = (target: UserProfile) => {
    if (target.uid === me?.uid) return false
    if (me?.role === 'admin' && target.role === 'superAdmin') return false
    return true
  }

  // ── Column templates ───────────────────────────────────────────
  const userTemplate = (row: TableRow) => {
    const initials = row.displayName
      ? row.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : row.email[0]?.toUpperCase() ?? '?'

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
            {row.displayName || '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>{row.email}</div>
        </div>
      </div>
    )
  }

  const roleTemplate = (row: TableRow) => {
    if (row._pending) {
      return <Tag value={ROLE_LABEL[row.role]} severity={ROLE_SEVERITY[row.role]} rounded />
    }
    const u = row as UserProfile
    if (can('change_roles') && canActOn(u)) {
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

  const statusTemplate = (row: TableRow) => {
    if (row._pending) return <Tag value="Pending" severity="warning" rounded />
    const u = row as UserProfile
    return (
      <Tag
        value={u.isActive ? 'Active' : 'Disabled'}
        severity={u.isActive ? 'success' : 'secondary'}
        rounded
      />
    )
  }

  const actionsTemplate = (row: TableRow) => {
    if (row._pending) {
      return (
        <div className="flex gap-1 justify-content-end">
          {can('invite_users') && (
            <Button
              icon="pi pi-times"
              size="small"
              severity="danger"
              text
              rounded
              tooltip="Cancel Registration"
              tooltipOptions={{ position: 'top' }}
              onClick={() => handleDeletePending(row as PendingUser)}
            />
          )}
        </div>
      )
    }

    const u = row as UserProfile
    return (
      <div className="flex gap-1 justify-content-end">
        {can('disable_users') && canActOn(u) && (
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
        {can('delete_users') && canActOn(u) && (
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

  const rows: TableRow[] = [
    ...users.map(u => ({ ...u, _pending: false as const })),
    ...pending.map(p => ({ ...p, _pending: true as const })),
  ]

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
            {pending.length > 0 && ` · ${pending.length} pending`}
          </p>
        </div>
        {can('invite_users') && (
          <Button
            label="Add User"
            icon="pi pi-user-plus"
            size="small"
            onClick={() => setDialogOpen(true)}
          />
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <DataTable
        value={rows}
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

      {/* ── Add User Dialog ─────────────────────────────────────── */}
      <Dialog
        header="Add User"
        visible={dialogOpen}
        style={{ width: '400px' }}
        onHide={() => { setDialogOpen(false); setForm(EMPTY_FORM) }}
        footer={
          <div className="flex justify-content-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM) }}
            />
            <Button
              label="Add User"
              icon="pi pi-check"
              loading={saving}
              disabled={!form.displayName.trim() || !form.email.trim()}
              onClick={handleAddUser}
            />
          </div>
        }
      >
        <div className="flex flex-column gap-3 pt-2">
          <div className="flex flex-column gap-1">
            <label className="text-sm font-medium">Full Name</label>
            <InputText
              value={form.displayName}
              onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
              placeholder="Jane Doe"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-sm font-medium">Google Email</label>
            <InputText
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jane@gmail.com"
              keyfilter="email"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label className="text-sm font-medium">Role</label>
            <Dropdown
              value={form.role}
              options={can('create_super_admin') ? ROLE_OPTIONS : ROLE_OPTIONS.filter(o => o.value !== 'superAdmin')}
              onChange={(e) => setForm(f => ({ ...f, role: e.value }))}
            />
          </div>
          <p className="text-xs m-0" style={{ color: 'var(--text-color-secondary)' }}>
            The user will be able to sign in with their Google account once registered.
          </p>
        </div>
      </Dialog>
    </div>
  )
}

export default UsersPage
