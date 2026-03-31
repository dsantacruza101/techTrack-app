import { Sidebar } from 'primereact/sidebar'
import { Button } from 'primereact/button'
import { Tag } from 'primereact/tag'
import { Divider } from 'primereact/divider'
import LifespanBar from './LifespanBar'
import {
  getLifespanPercent,
  getLifespanStatus,
  LIFESPAN_STATUS_LABEL,
  LIFESPAN_STATUS_SEVERITY,
} from '../types/asset.types'
import { CATEGORY_COLORS } from '../../categories/types/category.types'
import type { Asset } from '../types/asset.types'
import type { Category, ColorKey } from '../../categories/types/category.types'

interface AssetDetailPanelProps {
  asset: Asset | null
  categories: Category[]
  visible: boolean
  onHide: () => void
  onEdit: (asset: Asset) => void
}

const STATUS_SEVERITY: Record<string, 'success' | 'warning' | 'danger' | 'secondary' | 'info'> = {
  active:      'success',
  maintenance: 'warning',
  storage:     'info',
  retired:     'secondary',
}

const STATUS_LABEL: Record<string, string> = {
  active:      'Active',
  maintenance: 'Maintenance',
  storage:     'In Storage',
  retired:     'Retired',
}

const DetailRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null
  return (
    <div className="flex flex-column gap-1">
      <span
        className="font-mono text-xs"
        style={{ letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}
      >
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--text-color)' }}>{value}</span>
    </div>
  )
}

const AssetDetailPanel = ({ asset, categories, visible, onHide, onEdit }: AssetDetailPanelProps) => {
  if (!asset) return null

  const cat       = categories.find(c => c.id === asset.categoryId)
  const color     = cat ? (CATEGORY_COLORS[cat.colorKey as ColorKey] ?? CATEGORY_COLORS.blue) : CATEGORY_COLORS.blue
  const status    = getLifespanStatus(asset.purchaseDate, asset.lifespanYears)
  const pct       = Math.round(getLifespanPercent(asset.purchaseDate, asset.lifespanYears) * 100)
  const replaceBy = new Date(asset.purchaseDate.toDate())
  replaceBy.setFullYear(replaceBy.getFullYear() + asset.lifespanYears)

  const formatDate  = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const formatPrice = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <Sidebar
      visible={visible}
      onHide={onHide}
      position="right"
      style={{ width: '400px' }}
      pt={{
        root:    { style: { background: 'var(--surface-card)', borderLeft: '1px solid var(--surface-border)' } },
        header:  { style: { display: 'none' } },
        content: { style: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } },
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div className="flex align-items-start justify-content-between gap-3">
          <div className="flex align-items-center gap-3">
            <div
              className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
              style={{ width: 44, height: 44, background: color.bg, color: color.text, fontSize: 20 }}
            >
              <i className={cat?.icon ?? 'pi pi-box'} />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: 'var(--text-color)' }}>{asset.name}</div>
              {(asset.brand || asset.model) && (
                <div className="font-mono text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
                  {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
          <Button icon="pi pi-times" text severity="secondary" rounded size="small" onClick={onHide} />
        </div>

        <div className="flex gap-2 mt-3">
          <Tag
            value={STATUS_LABEL[asset.status ?? 'active']}
            severity={STATUS_SEVERITY[asset.status ?? 'active']}
            rounded
          />
          {cat && (
            <Tag value={cat.name} severity="secondary" rounded />
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-column gap-4">

        {/* Identification */}
        <div className="flex flex-column gap-3">
          <div className="font-mono text-xs font-semibold" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
            Identification
          </div>
          <div className="grid" style={{ rowGap: '1rem' }}>
            <div className="col-6"><DetailRow label="Serial Number" value={asset.serialNumber || '—'} /></div>
            <div className="col-6"><DetailRow label="Asset Tag"     value={asset.assetTag || '—'} /></div>
            <div className="col-6"><DetailRow label="Brand"         value={asset.brand || '—'} /></div>
            <div className="col-6"><DetailRow label="Model"         value={asset.model || '—'} /></div>
          </div>
          {asset.assignedTo && (
            <DetailRow label="Assigned To" value={asset.assignedTo} />
          )}
        </div>

        <Divider style={{ margin: '0' }} />

        {/* Purchase */}
        <div className="flex flex-column gap-3">
          <div className="font-mono text-xs font-semibold" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
            Purchase
          </div>
          <div className="grid" style={{ rowGap: '1rem' }}>
            <div className="col-6"><DetailRow label="Purchase Date"  value={formatDate(asset.purchaseDate.toDate())} /></div>
            <div className="col-6"><DetailRow label="Purchase Price" value={asset.purchasePrice ? formatPrice(asset.purchasePrice) : '—'} /></div>
            <div className="col-6"><DetailRow label="Lifespan"       value={`${asset.lifespanYears} year${asset.lifespanYears !== 1 ? 's' : ''}`} /></div>
            <div className="col-6"><DetailRow label="Replace By"     value={formatDate(replaceBy)} /></div>
          </div>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* Lifespan */}
        <div className="flex flex-column gap-3">
          <div className="flex justify-content-between align-items-center">
            <div className="font-mono text-xs font-semibold" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
              Lifespan Used
            </div>
            <Tag
              value={LIFESPAN_STATUS_LABEL[status]}
              severity={LIFESPAN_STATUS_SEVERITY[status]}
              rounded
              style={{ fontSize: 10 }}
            />
          </div>
          <LifespanBar purchaseDate={asset.purchaseDate} lifespanYears={asset.lifespanYears} />
          <div className="flex justify-content-between text-xs" style={{ color: 'var(--text-color-secondary)' }}>
            <span>{formatDate(asset.purchaseDate.toDate())}</span>
            <span className="font-semibold" style={{ color: pct >= 80 ? 'var(--tt-red)' : 'var(--text-color)' }}>{pct}%</span>
            <span>{formatDate(replaceBy)}</span>
          </div>
        </div>

        {/* Notes */}
        {asset.notes && (
          <>
            <Divider style={{ margin: '0' }} />
            <div className="flex flex-column gap-2">
              <div className="font-mono text-xs font-semibold" style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}>
                Notes
              </div>
              <p className="text-sm m-0" style={{ color: 'var(--text-color)', lineHeight: 1.6 }}>{asset.notes}</p>
            </div>
          </>
        )}

      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      {!asset.isDeleted && (
        <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <Button
            label="Edit Asset"
            icon="pi pi-pencil"
            className="flex-1"
            onClick={() => { onEdit(asset); onHide() }}
          />
        </div>
      )}

    </Sidebar>
  )
}

export default AssetDetailPanel
