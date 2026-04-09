import { NavLink } from 'react-router-dom'
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
  { label: 'Assets',           icon: 'pi pi-box',      to: '/assets' },
  { label: 'Preventive Care',  icon: 'pi pi-wrench',   to: '/preventive-care' },
  { label: 'Work Orders',      icon: 'pi pi-clipboard',to: '/work-orders' },
  { label: 'IT Management',    icon: 'pi pi-desktop',  to: '/it-management' },
  { label: 'Inventory',        icon: 'pi pi-inbox',    to: '/inventory' },
  { label: 'Finance',          icon: 'pi pi-dollar',   to: '/finance',   requiredPermission: 'view_finance' },
  { label: 'Analytics',        icon: 'pi pi-chart-line', to: '/analytics', requiredPermission: 'view_reports' },
  { label: 'Reports',          icon: 'pi pi-chart-bar',  to: '/reports', requiredPermission: 'view_reports' },
  { label: 'Map',              icon: 'pi pi-map',      to: '/map' },
  { label: 'Mobile & QR',      icon: 'pi pi-mobile',   to: '/mobile-qr' },
  { label: 'Options',          icon: 'pi pi-cog',      to: '/options',  requiredPermission: 'manage_settings' },
]

const MOBILE_TABS: Tab[] = [
  { label: 'Assets',      icon: 'pi pi-box',       to: '/assets' },
  { label: 'Orders',      icon: 'pi pi-clipboard', to: '/work-orders' },
  { label: 'Inventory',   icon: 'pi pi-inbox',     to: '/inventory' },
  { label: 'Map',         icon: 'pi pi-map',       to: '/map' },
  { label: 'Mobile',      icon: 'pi pi-mobile',    to: '/mobile-qr' },
]

const MainTabBar = () => {
  const { can } = usePermissions()

  const filterVisibleTabs = (tabs: Tab[]) => tabs.filter(tab => {
    if (tab.superAdminOnly) return can('manage_integrations')
    if (tab.requiredPermission) return can(tab.requiredPermission)
    return true
  })

  const desktopTabs = filterVisibleTabs(DESKTOP_TABS)
  const mobileTabs = filterVisibleTabs(MOBILE_TABS)

  return (
    <>
      <nav className="tt-tabbar-desktop hidden md:flex" aria-label="Primary sections">
        {desktopTabs.map(tab => (
          <NavLink key={tab.to} to={tab.to} className="tt-tabbar-link">
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <nav className="tt-tabbar-mobile md:hidden" aria-label="Mobile primary sections">
        {mobileTabs.map(tab => (
          <NavLink key={tab.to} to={tab.to} className="tt-tabbar-mobile-link">
            <i className={tab.icon} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default MainTabBar
