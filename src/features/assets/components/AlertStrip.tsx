import type { Asset } from '../types/asset.types'
import { getLifespanStatus } from '../types/asset.types'

interface AlertStripProps {
  assets: Asset[]
}

interface AlertPillProps {
  icon: string
  label: string
  count: number
  color: string
  bg: string
}

const AlertPill = ({ icon, label, count, color, bg }: AlertPillProps) => (
  <div
    className="flex align-items-center gap-2 border-round-3xl px-3 py-2"
    style={{ background: bg, border: `1px solid ${color}33` }}
  >
    <i className={icon} style={{ color, fontSize: 13 }} />
    <span className="font-mono text-xs font-semibold" style={{ color }}>
      {count} {label}
    </span>
  </div>
)

const AlertStrip = ({ assets }: AlertStripProps) => {
  const critical    = assets.filter(a => !a.isDeleted && getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'replace').length
  const maintenance = assets.filter(a => !a.isDeleted && a.status === 'maintenance').length

  if (critical === 0 && maintenance === 0) return null

  return (
    <div className="flex align-items-center gap-2 flex-wrap">
      {critical > 0 && (
        <AlertPill
          icon="pi pi-exclamation-circle"
          label={`asset${critical !== 1 ? 's' : ''} need replacing`}
          count={critical}
          color="#ef4444"
          bg="rgba(239,68,68,0.08)"
        />
      )}
      {maintenance > 0 && (
        <AlertPill
          icon="pi pi-wrench"
          label={`in maintenance`}
          count={maintenance}
          color="#f59e0b"
          bg="rgba(245,158,11,0.08)"
        />
      )}
    </div>
  )
}

export default AlertStrip
