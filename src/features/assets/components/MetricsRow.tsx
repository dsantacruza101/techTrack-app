import type { Asset } from '../types/asset.types'
import { getLifespanStatus } from '../types/asset.types'

interface MetricsRowProps {
  assets: Asset[]
}

interface MetricCardProps {
  label: string
  value: number
  icon: string
  iconColor: string
  iconBg: string
}

const MetricCard = ({ label, value, icon, iconColor, iconBg }: MetricCardProps) => (
  <div
    className="flex align-items-center gap-3 border-round-xl p-3 flex-1"
    style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
  >
    <div
      className="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
      style={{ width: 40, height: 40, background: iconBg, color: iconColor, fontSize: 18 }}
    >
      <i className={icon} />
    </div>
    <div>
      <div
        className="font-serif font-semibold"
        style={{ fontSize: '22px', lineHeight: 1, color: 'var(--text-color)' }}
      >
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-color-secondary)' }}>
        {label}
      </div>
    </div>
  </div>
)

const MetricsRow = ({ assets }: MetricsRowProps) => {
  const active      = assets.filter(a => (a.status ?? 'active') === 'active').length
  const maintenance = assets.filter(a => (a.status ?? 'active') === 'maintenance').length
  const storage     = assets.filter(a => (a.status ?? 'active') === 'storage').length
  const replaceSoon = assets.filter(a => getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace').length

  return (
    <div className="flex gap-3 flex-wrap">
      <MetricCard
        label="Total Assets"
        value={assets.length}
        icon="pi pi-server"
        iconColor="#4f8fff"
        iconBg="rgba(79,143,255,0.15)"
      />
      <MetricCard
        label="Active"
        value={active}
        icon="pi pi-check-circle"
        iconColor="#22c55e"
        iconBg="rgba(34,197,94,0.15)"
      />
      <MetricCard
        label="Maintenance"
        value={maintenance}
        icon="pi pi-wrench"
        iconColor="#f59e0b"
        iconBg="rgba(245,158,11,0.15)"
      />
      <MetricCard
        label="Replace Soon"
        value={replaceSoon}
        icon="pi pi-exclamation-triangle"
        iconColor="#ef4444"
        iconBg="rgba(239,68,68,0.15)"
      />
      <MetricCard
        label="In Storage"
        value={storage}
        icon="pi pi-inbox"
        iconColor="#06b6d4"
        iconBg="rgba(6,182,212,0.15)"
      />
    </div>
  )
}

export default MetricsRow
