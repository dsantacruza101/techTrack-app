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

  const isParamActive =
    paramKey && paramValue ? searchParams.get(paramKey) === paramValue : false

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => {
        const active = paramKey ? isParamActive : isActive
        return `tt-nav-item flex align-items-center gap-2 px-3 py-2 border-round-lg${active ? ' active' : ''}`
      }}
    >
      <i className={`${icon} text-sm flex-shrink-0`} style={{ width: '16px', textAlign: 'center' }} />
      <span className="flex-1 text-sm">{label}</span>
      {badge !== undefined && (
        <span
          className="tt-nav-badge font-mono text-xs px-2 py-1 border-round-xl"
          style={{ background: 'var(--surface-c)', border: '1px solid var(--surface-d)' }}
        >
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export default SidebarNavItem
