import { useNavigate, useLocation } from 'react-router-dom'
import { usePermissions } from '../../../../features/auth/hooks/usePermissions'

interface Tab {
  label: string
  emoji: string
  to: string
  requiredPermission?: Parameters<ReturnType<typeof usePermissions>['can']>[0]
  superAdminOnly?: boolean
}

const TABS: Tab[] = [
  { label: 'Assets',                emoji: '📦', to: '/assets'                                                },
  { label: 'Preventive Care',       emoji: '🔧', to: '/preventive-care'                                      },
  { label: 'Work Orders',           emoji: '📋', to: '/work-orders'                                          },
  { label: 'IT Management',         emoji: '🖥',  to: '/it-management'                                       },
  { label: 'Inventory',             emoji: '🗃',  to: '/inventory'                                           },
  { label: 'Finance & Depreciation',emoji: '💰', to: '/finance',        requiredPermission: 'view_finance'   },
  { label: 'Analytics',             emoji: '📈', to: '/analytics',      requiredPermission: 'view_reports'   },
  { label: 'Reports',               emoji: '📊', to: '/reports',        requiredPermission: 'view_reports'   },
  { label: 'Map View',              emoji: '🗺',  to: '/map'                                                 },
  { label: 'Mobile & QR',           emoji: '📱', to: '/mobile-qr'                                           },
  { label: 'Options',               emoji: '⚙',  to: '/options',       requiredPermission: 'manage_settings' },
]

const MainTabBar = () => {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { can }    = usePermissions()

  const visibleTabs = TABS.filter(tab => {
    if (tab.superAdminOnly) return can('manage_integrations')
    if (tab.requiredPermission) return can(tab.requiredPermission)
    return true
  })

  return (
    <div
      style={{
        position: 'sticky',
        top: '62px',       // sits just below the topbar (62px)
        zIndex: 45,
        background: 'var(--surface-card)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: 2,
        padding: '0 28px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        flexShrink: 0,
      }}
    >
      {visibleTabs.map(tab => {
        const isActive = location.pathname === tab.to

        return (
          <button
            key={tab.to}
            onClick={() => navigate(tab.to)}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             6,
              padding:         '11px 14px',
              fontSize:        13,
              fontWeight:      500,
              fontFamily:      'inherit',
              color:           isActive ? 'var(--primary-color)' : 'var(--text-color-secondary)',
              background:      'transparent',
              border:          'none',
              borderBottom:    isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
              marginBottom:    -1,
              cursor:          'pointer',
              whiteSpace:      'nowrap',
              userSelect:      'none',
              transition:      'color 0.15s, border-color 0.15s',
              outline:         'none',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color)' }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-color-secondary)' }}
          >
            <span style={{ fontSize: 14 }}>{tab.emoji}</span>
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export default MainTabBar
