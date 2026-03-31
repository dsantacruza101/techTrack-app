import { useNavigate } from 'react-router-dom'
import SidebarNavItem from './SidebarNavItem'
import SidebarNavSection from './SidebarNavSection'
import { usePermissions } from '../../../../features/auth/hooks/usePermissions'
import { useCategories } from '../../../../features/categories/hooks/useCategories'
import { useAssets } from '../../../../features/assets/hooks/useAssets'
import { getLifespanStatus } from '../../../../features/assets/types/asset.types'
import './Sidebar.css'

interface SidebarProps {
  onNavClick?: () => void
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const Sidebar = ({ onNavClick }: SidebarProps) => {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const { assets } = useAssets()

  // Per-category counts (active assets only)
  const countByCategory = (catId: string) =>
    assets.filter(a => a.categoryId === catId).length

  // "Needs replacing" count
  const replaceCount = assets.filter(
    a => getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace'
  ).length

  // Total value
  const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice ?? 0), 0)

  return (
    <div className="flex flex-column h-full w-full">

      {/* ── Logo ───────────────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex-shrink-0 cursor-pointer"
        style={{ borderBottom: '1px solid var(--surface-border)' }}
        onClick={() => navigate('/assets')}
      >
        <div className="font-serif text-2xl font-bold" style={{ letterSpacing: '-0.5px', color: 'var(--text-color)' }}>
          Tech<span style={{ color: 'var(--primary-color)' }}>Track</span>
        </div>
        <div className="font-mono text-xs mt-1" style={{ letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
          Asset Management
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <nav className="flex flex-column flex-1 overflow-y-auto px-3 py-3 gap-1">

        <SidebarNavSection label="Overview" />
        <SidebarNavItem
          label="All Assets"
          icon="pi pi-th-large"
          to="/assets"
          badge={assets.length}
          onClick={onNavClick}
        />

        {categories.length > 0 && (
          <>
            <SidebarNavSection label="Categories" />
            {categories.map((cat) => (
              <SidebarNavItem
                key={cat.id}
                label={cat.name}
                icon={cat.icon}
                to={`/assets?category=${cat.id}`}
                paramKey="category"
                paramValue={cat.id}
                badge={countByCategory(cat.id)}
                onClick={onNavClick}
              />
            ))}
          </>
        )}

        <SidebarNavSection label="Status" />
        <SidebarNavItem
          label="Needs Replacing"
          icon="pi pi-exclamation-triangle"
          to="/assets?status=replace"
          paramKey="status"
          paramValue="replace"
          badge={replaceCount}
          onClick={onNavClick}
        />

        {can('manage_categories') && (
          <>
            <SidebarNavSection label="Management" />
            <SidebarNavItem label="Categories" icon="pi pi-tag" to="/categories" onClick={onNavClick} />
          </>
        )}

        {can('invite_users') && (
          <SidebarNavItem label="Users" icon="pi pi-users" to="/users" onClick={onNavClick} />
        )}

      </nav>

      {/* ── Footer stat ────────────────────────────────────────── */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <div className="border-round-lg p-3" style={{ background: 'var(--surface-hover)', border: '1px solid var(--surface-border)' }}>
          <div className="font-mono text-xs mb-1" style={{ letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
            Total Value Est.
          </div>
          <div className="font-serif font-semibold" style={{ fontSize: '22px', color: 'var(--text-color)' }}>
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
            across {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Sidebar
