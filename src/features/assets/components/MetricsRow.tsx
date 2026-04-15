import type { Asset } from '../types/asset.types'
import { getLifespanStatus } from '../types/asset.types'

interface MetricsRowProps {
  assets: Asset[]
}

interface MetricCardProps {
  label:     string
  value:     number
  icon:      string
  color:     string
  subtitle?: string
}

const MetricCard = ({ label, value, icon, color, subtitle }: MetricCardProps) => (
  <div
    className="flex flex-column relative overflow-hidden"
    style={{
      flex:         '1 1 140px',
      background:   'var(--surface-card)',
      border:       '1px solid var(--surface-border)',
      borderRadius: 12,
      padding:      '16px 18px',
      borderTop:    `3px solid ${color}`,
      minWidth:     0,
      transition:   'border-color 0.2s',
    }}
  >
    <i
      className={icon}
      style={{ position: 'absolute', right: 14, top: 14, fontSize: 18, color, opacity: 0.15 }}
    />
    <div
      className="font-mono uppercase mb-2"
      style={{ fontSize: 10, letterSpacing: '2px', color: 'var(--text-color-secondary)' }}
    >
      {label}
    </div>
    <div className="font-serif font-bold text-900" style={{ fontSize: 32, lineHeight: 1 }}>
      {value}
    </div>
    {subtitle && (
      <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
        {subtitle}
      </div>
    )}
  </div>
)

const MetricsRow = ({ assets }: MetricsRowProps) => {
  const total       = assets.length
  const active      = assets.filter(a => a.status === 'active').length
  const maintenance = assets.filter(a => a.status === 'maintenance').length
  const storage     = assets.filter(a => a.status === 'storage').length
  const replaceSoon = assets.filter(a => getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace').length

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <MetricCard label="Total Assets" value={total}       icon="pi pi-server"              color="#4f8fff" subtitle="in inventory"   />
      <MetricCard label="Active"       value={active}      icon="pi pi-check-circle"         color="#22c55e" subtitle="in use"         />
      <MetricCard label="Maintenance"  value={maintenance} icon="pi pi-wrench"               color="#f59e0b" subtitle="being serviced" />
      <MetricCard label="Replace Soon" value={replaceSoon} icon="pi pi-exclamation-triangle" color="#ef4444" subtitle="≥75% lifespan"  />
      <MetricCard label="In Storage"   value={storage}     icon="pi pi-inbox"                color="#7c3aed" subtitle="not deployed"   />
    </div>
  )
}

export default MetricsRow
