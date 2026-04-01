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

  // Conteo por categoría
  const countByCategory = (catId: string) =>
    assets.filter(a => a.categoryId === catId).length

  // Conteo de equipos que necesitan reemplazo
  const replaceCount = assets.filter(
    a => getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace'
  ).length

  // Valor total de activos
  const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice ?? 0), 0)

  return (
    <div className="flex flex-column h-full w-full surface-card">
      
      {/* ── Logo ───────────────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex-shrink-0 cursor-pointer border-bottom-1 border-white-alpha-10"
        onClick={() => navigate('/assets')}
      >
        <div className="font-serif text-2xl font-bold text-900 tracking-tight">
          Tech<span className="text-primary">Track</span>
        </div>
        <div className="font-mono text-xs mt-1 uppercase tracking-widest text-500" style={{ fontSize: '9px' }}>
          Asset Management
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <nav className="flex flex-column flex-1 overflow-y-auto px-3 py-3 gap-1 custom-scrollbar">
        
        {/* Overview */}
        <SidebarNavSection label="Overview" />
        <SidebarNavItem 
          label="All Assets" 
          icon="pi pi-th-large" 
          to="/assets" 
          badge={assets.length} 
          onClick={onNavClick} 
        />

        {/* Categories (Dinámicas) */}
        {categories.length > 0 && (
          <>
            <SidebarNavSection label="Categories" />
            {categories.map((cat) => (
              <SidebarNavItem
                key={cat.id}
                label={cat.name}
                icon={cat.icon || 'pi pi-folder'} // Fallback si no hay icono
                to={`/assets?category=${cat.id}`}
                paramKey="category"
                paramValue={cat.id}
                badge={countByCategory(cat.id)}
                onClick={onNavClick}
              />
            ))}
          </>
        )}

        {/* Status */}
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

        {/* Management (Protegido por permisos) */}
        {(can('manage_categories') || can('invite_users')) && (
          <SidebarNavSection label="Management" />
        )}
        
        {can('manage_categories') && (
          <SidebarNavItem 
            label="Categories" 
            icon="pi pi-tag" 
            to="/categories" 
            onClick={onNavClick} 
          />
        )}

        {can('invite_users') && (
          <SidebarNavItem 
            label="Users" 
            icon="pi pi-users" 
            to="/users" 
            onClick={onNavClick} 
          />
        )}

      </nav>

      {/* ── Footer stat ────────────────────────────────────────── */}
      <div className="p-3 mt-auto border-top-1 border-white-alpha-10">
        <div className="surface-hover border-round-xl p-3 border-1 border-white-alpha-10">
          <div className="font-mono text-[10px] mb-2 uppercase tracking-wider text-500">
            Total Value Est.
          </div>
          <div className="font-serif font-semibold text-2xl text-900">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-xs mt-1 text-500">
            across {assets.length} asset{assets.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Sidebar