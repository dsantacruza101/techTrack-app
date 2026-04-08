import { useRef } from 'react'
import { Menu } from 'primereact/menu'
import { Avatar } from 'primereact/avatar'
import type { MenuItem } from 'primereact/menuitem'
import { useAuth } from '../../../../contexts/AuthContext'

const UserMenu = () => {
  const menuRef = useRef<Menu>(null)
  const { userProfile, role, logout } = useAuth()

  const initials = userProfile?.displayName
    ? userProfile.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userProfile?.email?.[0].toUpperCase() ?? '?'

  const items: MenuItem[] = [
    {
      template: () => (
        <div className="px-3 py-3 border-bottom-1 border-white-alpha-10 mb-1">
          <div className="text-sm font-semibold text-900 line-height-2 text-overflow-ellipsis overflow-hidden white-space-nowrap">
            {userProfile?.displayName || userProfile?.email || 'User'}
          </div>
          <div className="font-mono text-xs mt-1 uppercase tracking-widest text-500" style={{ fontSize: '10px' }}>
            {role || 'Member'}
          </div>
        </div>
      ),
    },
    {
      label: 'Sign out', 
      icon: 'pi pi-sign-out', 
      template: () => (
        <button 
          onClick={() => logout()}
          className="w-full p-link flex align-items-center p-3 text-red-400 hover:bg-red-900-alpha-10 transition-colors border-none bg-transparent cursor-pointer border-round-lg mt-1"
        >
          <i className="pi pi-sign-out mr-2"></i>
          <span className="font-medium">Sign out</span>
        </button>
      )
    },
  ]

  return (
    <div className="flex align-items-center">
      <Menu
        ref={menuRef}
        model={items}
        popup
        onShow={() => { document.body.style.overflow = 'hidden' }}
        onHide={() => { document.body.style.overflow = '' }}
        className="shadow-4"
        style={{ backgroundColor: 'var(--surface-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}
        pt={{
            root: {
              className: 'w-15rem p-2',
              style: { zIndex: 1100, background: 'var(--surface-card)', borderRadius: 16 },
            },
            menu: { className: 'p-0 list-none', style: { background: 'var(--surface-card)' } },
            action: { className: 'hover:surface-hover p-3 border-round-lg transition-colors flex align-items-center' },
            icon: { className: 'mr-2 text-primary' },
            label: { className: 'text-900' },
        }}
      />
      <Avatar
        label={initials}
        shape="circle"
        onClick={(e) => menuRef.current?.toggle(e)}
        className="cursor-pointer border-1 border-blue-500-alpha-30 bg-blue-900-alpha-20 text-primary font-mono text-xs transition-all hover:border-blue-500"
        style={{ width: '32px', height: '32px' }}
      />
    </div>
  )
}

export default UserMenu