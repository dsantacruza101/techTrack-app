import { useRef } from 'react'
import { Menu } from 'primereact/menu'
import { Avatar } from 'primereact/avatar'
import type { MenuItem } from 'primereact/menuitem'
import { useAuth } from '../../../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const UserMenu = () => {
  const menuRef = useRef<Menu>(null)
  const { userProfile, role, logout } = useAuth()
  const navigate = useNavigate()

  const initials = userProfile?.displayName
    ? userProfile.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userProfile?.email?.[0].toUpperCase() ?? '?'

  const items: MenuItem[] = [
    {
      template: () => (
        <div className="px-3 py-2">
          <div className="text-sm font-medium white-space-nowrap overflow-hidden text-overflow-ellipsis" style={{ color: 'var(--text-color)', maxWidth: '160px' }}>
            {userProfile?.displayName || userProfile?.email}
          </div>
          <div className="font-mono text-xs mt-1" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
            {role}
          </div>
        </div>
      ),
    },
    { separator: true },
    {
      label: 'My Profile',
      icon: 'pi pi-user',
      command: () => navigate('/profile'),
    },
    { separator: true },
    {
      label: 'Sign out',
      icon: 'pi pi-sign-out',
      command: logout,
      style: { color: 'var(--tt-red)' },
    },
  ]

  return (
    <>
      <Menu ref={menuRef} model={items} popup />
      <Avatar
        label={initials}
        shape="circle"
        onClick={(e) => menuRef.current?.toggle(e)}
        style={{
          cursor: 'pointer',
          background: 'rgba(79, 143, 255, 0.2)',
          color: 'var(--primary-color)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px',
          border: '1px solid rgba(79, 143, 255, 0.3)',
        }}
      />
    </>
  )
}

export default UserMenu
