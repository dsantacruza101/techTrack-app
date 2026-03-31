import { useLocation } from 'react-router-dom'
import { Toolbar } from 'primereact/toolbar'
import { Button } from 'primereact/button'
import UserMenu from './UserMenu'

interface TopbarProps {
  onMenuToggle: () => void
}

const PAGE_TITLES: Record<string, string> = {
  '/assets':     'All Assets',
  '/categories': 'Categories',
  '/users':      'Users',
  '/profile':    'My Profile',
}

const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'TechTrack'

  const start = (
    <div className="flex align-items-center gap-3">
      <Button
        icon="pi pi-bars"
        text
        severity="secondary"
        className="md:hidden"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      />
      <h1 className="font-serif m-0 text-xl font-semibold" style={{ color: 'var(--text-color)' }}>
        {title}
      </h1>
    </div>
  )

  return (
    <Toolbar
      start={start}
      end={<UserMenu />}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: '1px solid var(--surface-border)',
        background: 'var(--surface-card)',
        padding: '0 1.5rem',
        height: '60px',
        flexShrink: 0,
      }}
    />
  )
}

export default Topbar
