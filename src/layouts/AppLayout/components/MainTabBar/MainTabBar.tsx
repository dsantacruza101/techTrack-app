import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { usePermissions } from '../../../../features/auth/hooks/usePermissions'
import './MainTabBar.css'

interface Tab {
  label: string
  icon: string
  to: string
  requiredPermission?: Parameters<ReturnType<typeof usePermissions>['can']>[0]
  superAdminOnly?: boolean
}

const DESKTOP_TABS: Tab[] = [
  { label: 'Assets',           icon: 'pi pi-box',        to: '/assets' },
  { label: 'Preventive Care',  icon: 'pi pi-wrench',     to: '/preventive-care' },
  { label: 'Work Orders',      icon: 'pi pi-clipboard',  to: '/work-orders' },
  { label: 'IT Management',    icon: 'pi pi-desktop',    to: '/it-management' },
  { label: 'Inventory',        icon: 'pi pi-inbox',      to: '/inventory' },
  { label: 'Finance',          icon: 'pi pi-dollar',     to: '/finance',    requiredPermission: 'view_finance' },
  { label: 'Analytics',        icon: 'pi pi-chart-line', to: '/analytics',  requiredPermission: 'view_reports' },
  { label: 'Reports',          icon: 'pi pi-chart-bar',  to: '/reports',    requiredPermission: 'view_reports' },
  { label: 'Map',              icon: 'pi pi-map',        to: '/map' },
  { label: 'Mobile & QR',      icon: 'pi pi-mobile',     to: '/mobile-qr' },
  { label: 'Options',          icon: 'pi pi-cog',        to: '/options',    requiredPermission: 'manage_settings' },
]

// Always-visible bottom tabs
const PINNED_TABS: Tab[] = [
  { label: 'Assets',    icon: 'pi pi-box',       to: '/assets' },
  { label: 'Orders',    icon: 'pi pi-clipboard', to: '/work-orders' },
  { label: 'Inventory', icon: 'pi pi-inbox',     to: '/inventory' },
  { label: 'Map',       icon: 'pi pi-map',       to: '/map' },
]

// Shown inside the "More" sheet
const MORE_TABS: Tab[] = [
  { label: 'Preventive Care', icon: 'pi pi-wrench',     to: '/preventive-care' },
  { label: 'IT Management',   icon: 'pi pi-desktop',    to: '/it-management' },
  { label: 'Finance',         icon: 'pi pi-dollar',     to: '/finance',    requiredPermission: 'view_finance' },
  { label: 'Analytics',       icon: 'pi pi-chart-line', to: '/analytics',  requiredPermission: 'view_reports' },
  { label: 'Reports',         icon: 'pi pi-chart-bar',  to: '/reports',    requiredPermission: 'view_reports' },
  { label: 'Mobile & QR',     icon: 'pi pi-mobile',     to: '/mobile-qr' },
  { label: 'Options',         icon: 'pi pi-cog',        to: '/options',    requiredPermission: 'manage_settings' },
]

const MainTabBar = () => {
  const { can }       = usePermissions()
  const location      = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const filterVisible = (tabs: Tab[]) => tabs.filter(tab => {
    if (tab.superAdminOnly)     return can('manage_integrations')
    if (tab.requiredPermission) return can(tab.requiredPermission)
    return true
  })

  const desktopTabs  = filterVisible(DESKTOP_TABS)
  const pinnedTabs   = filterVisible(PINNED_TABS)
  const moreTabs     = filterVisible(MORE_TABS)

  // "More" tab is active when the current route is one of the more tabs
  const moreIsActive = moreTabs.some(t => location.pathname.startsWith(t.to))

  const closeSheet = () => setMoreOpen(false)

  return (
    <>
      {/* ── Desktop tab bar ──────────────────────────────────────── */}
      <nav className="tt-tabbar-desktop hidden md:flex" aria-label="Primary sections">
        {desktopTabs.map(tab => (
          <NavLink key={tab.to} to={tab.to} className="tt-tabbar-link">
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      <nav className="tt-tabbar-mobile md:hidden" aria-label="Mobile primary sections">
        {pinnedTabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className="tt-tabbar-mobile-link"
            onClick={closeSheet}
          >
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          className={`tt-tabbar-mobile-link tt-tabbar-more-btn${moreIsActive || moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen(o => !o)}
          aria-label="More navigation options"
        >
          <i className="pi pi-ellipsis-h" />
          <span>More</span>
        </button>
      </nav>

      {/* ── More sheet (mobile only) ─────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div className="tt-more-backdrop md:hidden" onClick={closeSheet} />

          {/* Sheet */}
          <div className="tt-more-sheet md:hidden" role="dialog" aria-label="More options">
            {/* Handle */}
            <div className="tt-more-handle" />

            <p className="tt-more-title">More</p>

            <div className="tt-more-grid">
              {moreTabs.map(tab => {
                const isActive = location.pathname.startsWith(tab.to)
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={`tt-more-item${isActive ? ' active' : ''}`}
                    onClick={closeSheet}
                  >
                    <div className="tt-more-item-icon">
                      <i className={tab.icon} />
                    </div>
                    <span>{tab.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default MainTabBar
