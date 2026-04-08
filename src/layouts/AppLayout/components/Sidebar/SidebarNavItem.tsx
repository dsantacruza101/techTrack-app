import { NavLink, useSearchParams } from 'react-router-dom'

interface SidebarNavItemProps {
  label: string
  icon: string
  to: string
  paramKey?: string
  paramValue?: string
  badge?: number
  onClick?: () => void
}

const SidebarNavItem = ({ label, icon, to, paramKey, paramValue, badge, onClick }: SidebarNavItemProps) => {
  const [searchParams] = useSearchParams()
  const isParamActive = paramKey && paramValue ? searchParams.get(paramKey) === paramValue : false

  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={({ isActive }) => {
        const active = paramKey ? isParamActive : isActive
        return {
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 10px', borderRadius: 8,
          textDecoration: 'none', transition: 'background 0.12s, color 0.12s',
          background: active ? 'rgba(79,143,255,0.12)' : 'transparent',
          color: active ? '#4f8fff' : 'rgba(255,255,255,0.45)',
          fontWeight: active ? 500 : 400,
        }
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.style.background.includes('79,143,255,0.12')) {
          el.style.background = 'rgba(255,255,255,0.04)'
          el.style.color = 'rgba(255,255,255,0.8)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        if (!el.style.background.includes('79,143,255,0.12')) {
          el.style.background = 'transparent'
          el.style.color = 'rgba(255,255,255,0.45)'
        }
      }}
    >
      {({ isActive }) => {
        const active = paramKey ? isParamActive : isActive
        return (
          <>
            <i className={icon} style={{ fontSize: 13, color: active ? '#4f8fff' : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
            {badge !== undefined && (
              <span style={{
                fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 500,
                padding: '1px 7px', borderRadius: 99,
                background: active ? 'rgba(79,143,255,0.2)' : 'rgba(255,255,255,0.06)',
                color: active ? '#4f8fff' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${active ? 'rgba(79,143,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                {badge}
              </span>
            )}
          </>
        )
      }}
    </NavLink>
  )
}

export default SidebarNavItem
