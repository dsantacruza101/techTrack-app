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
      className={({ isActive }) => {
        const active = paramKey ? isParamActive : isActive
        return `tt-nav-item flex align-items-center gap-3 px-3 py-2 border-round-lg transition-colors transition-duration-150 ${
          active ? 'bg-blue-900-alpha-10 text-primary font-medium' : 'text-500 hover:surface-hover hover:text-900'
        }`
      }}
    >
      <i className={`${icon} text-sm`} />
      <span className="flex-1 text-sm">{label}</span>
      {badge !== undefined && (
        <span className={`font-mono text-xs px-2 py-1 border-round-xl border-1 ${
          isParamActive ? 'border-blue-500-alpha-30 bg-blue-900-alpha-20' : 'border-white-alpha-10 bg-white-alpha-5'
        }`}>
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export default SidebarNavItem
