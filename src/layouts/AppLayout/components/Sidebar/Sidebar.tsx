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
  onAddAsset?: () => void
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const Sidebar = ({ onNavClick, onAddAsset }: SidebarProps) => {
  const { can }        = usePermissions()
  const navigate       = useNavigate()
  const { categories } = useCategories()
  const { assets }     = useAssets()

  const countByCategory = (catId: string) =>
    assets.filter(a => !a.isDeleted && a.categoryId === catId).length

  const replaceCount = assets.filter(
    a => !a.isDeleted && getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace'
  ).length

  const activeCount = assets.filter(a => !a.isDeleted).length

  const totalValue = assets
    .filter(a => !a.isDeleted)
    .reduce((sum, a) => sum + (a.purchasePrice ?? 0), 0)

  const handleAddAsset = () => {
    if (onAddAsset) { onAddAsset(); return }
    navigate('/assets?add=true')
    onNavClick?.()
  }

  return (
    <div className="flex flex-column h-full w-full surface-card">

      {/* ── Logo ───────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex-shrink-0 cursor-pointer"
        style={{ borderBottom: '1px solid var(--tt-border)' }}
        onClick={() => navigate('/assets')}
      >
        <div className="font-serif font-bold text-900" style={{ fontSize: 17 }}>
          Facilities <span className="text-primary">TechTrack</span>
        </div>
        <div className="font-mono mt-1 uppercase text-500" style={{ fontSize: 9, letterSpacing: '2px' }}>
          Asset Management
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex flex-column flex-1 overflow-y-auto px-3 py-3 gap-1">

        {/* Overview — only 2 core items */}
        <SidebarNavSection label="Overview" />
        <SidebarNavItem
          label="All Assets"
          icon="pi pi-th-large"
          to="/assets"
          badge={activeCount}
          onClick={onNavClick}
        />
        <SidebarNavItem
          label="Needs Replacing"
          icon="pi pi-exclamation-triangle"
          to="/assets?status=replace"
          paramKey="status"
          paramValue="replace"
          badge={replaceCount > 0 ? replaceCount : undefined}
          onClick={onNavClick}
        />

        {/* Categories */}
        {categories.filter(c => !c.isDeleted).length > 0 && (
          <>
            <SidebarNavSection label="Categories" />
            {categories.filter(c => !c.isDeleted).map(cat => (
              <SidebarNavItem
                key={cat.id}
                label={cat.name}
                icon={cat.icon || 'pi pi-folder'}
                to={`/assets?category=${cat.id}`}
                paramKey="category"
                paramValue={cat.id}
                badge={countByCategory(cat.id)}
                onClick={onNavClick}
              />
            ))}
          </>
        )}

        {/* Management — admin+ */}
        {(can('manage_categories') || can('invite_users')) && (
          <>
            <SidebarNavSection label="Management" />
            {can('manage_categories') && <SidebarNavItem label="Categories"   icon="pi pi-tag"   to="/categories"   onClick={onNavClick} />}
            {can('invite_users')      && <SidebarNavItem label="Users"        icon="pi pi-users" to="/users"        onClick={onNavClick} />}
            {can('manage_settings')   && <SidebarNavItem label="Options"      icon="pi pi-cog"   to="/options"      onClick={onNavClick} />}
          </>
        )}

      </nav>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="px-3 py-3 flex-column gap-2 hidden md:flex" style={{ borderTop: '1px solid var(--tt-border)' }}>

        {/* Add Asset button */}
        {can('add_asset') && (
          <button
            type="button"
            onClick={handleAddAsset}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--primary-color)', border: '1px solid var(--primary-color)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Asset
          </button>
        )}

        {/* Total Value stat */}
        <div
          className="border-round-lg p-3"
          style={{ border: '1px solid var(--tt-border)', background: 'var(--surface-section)' }}
        >
          <div className="font-mono uppercase text-500 mb-1" style={{ fontSize: 9, letterSpacing: '1.5px' }}>
            Total Value Est.
          </div>
          <div className="font-serif font-semibold text-900" style={{ fontSize: 22 }}>
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs mt-1 text-500">
            {activeCount} asset{activeCount !== 1 ? 's' : ''} tracked
          </div>
        </div>
      </div>

    </div>
  )
}

export default Sidebar
