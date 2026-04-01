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
        className="md:hidden p-button-sm"
        onClick={onMenuToggle}
      />
      <h1 className="font-serif m-0 text-xl font-semibold text-900">
        {title}
      </h1>
    </div>
  )

  return (
    <Toolbar
      start={start}
      end={<UserMenu />}
      className="sticky top-0 z-5 surface-card border-none border-bottom-1 border-white-alpha-10 px-4 h-4rem"
      style={{ borderRadius: 0 }}
    />
  )
}

export default Topbar
