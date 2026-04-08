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

// const AlertBanner = ({ icon, label, count, color }: any) => (
//   <div 
//     className="flex align-items-center gap-2 px-3 py-2 border-round-lg border-1 w-full md:w-auto"
//     style={{ background: `${color}15`, borderColor: `${color}33` }}
//   >
//     <i className={`${icon} text-sm`} style={{ color }} />
//     <span className="text-xs font-semibold" style={{ color }}>
//       {count} {label}
//     </span>
//   </div>
// )

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
  const aging       = assets.filter(a => !a.isDeleted && getLifespanStatus(a.purchaseDate, a.lifespanYears) === 'aging').length
  const maintenance = assets.filter(a => !a.isDeleted && a.status === 'maintenance').length

  if (critical === 0 && aging === 0 && maintenance === 0) return null

  return (
    <div className="flex align-items-center gap-2 flex-wrap">
      {critical > 0 && (
        <AlertPill icon="pi pi-exclamation-circle" label="past lifespan"    count={critical}    color="#ef4444" bg="rgba(239,68,68,0.1)"   />
      )}
      {aging > 0 && (
        <AlertPill icon="pi pi-clock"              label="end of life soon" count={aging}       color="#f59e0b" bg="rgba(245,158,11,0.1)"  />
      )}
      {maintenance > 0 && (
        <AlertPill icon="pi pi-wrench"             label="in maintenance"   count={maintenance} color="#f97316" bg="rgba(249,115,22,0.1)"  />
      )}
    </div>
  )
}

export default AlertStrip
