import type { Timestamp } from 'firebase/firestore'
import { getLifespanPercent } from '../types/asset.types'

interface LifespanBarProps {
  purchaseDate:  Timestamp
  lifespanYears: number
  showText?:     boolean
}

const LifespanBar = ({ purchaseDate, lifespanYears, showText = true }: LifespanBarProps) => {
  const pct   = getLifespanPercent(purchaseDate, lifespanYears)
  const value = Math.round(pct * 100)

  const color = value >= 90 ? '#ef4444' : value >= 70 ? '#f59e0b' : '#22c55e'

  const replaceDate = new Date(purchaseDate.toDate())
  replaceDate.setFullYear(replaceDate.getFullYear() + lifespanYears)
  const yearsLeft   = Math.max(0, (replaceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25))
  const remainText  = value >= 100
    ? 'Exceeded'
    : yearsLeft < 1
      ? `${Math.round(yearsLeft * 12)}mo left`
      : `${yearsLeft.toFixed(1)}yr left`

  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ height: 4, background: 'var(--surface-border)', borderRadius: 99, overflow: 'hidden' }}>
        <div
          style={{
            height:       '100%',
            width:        `${Math.min(value, 100)}%`,
            background:   color,
            borderRadius: 99,
            boxShadow:    `0 0 6px ${color}55`,
            transition:   'width 0.3s',
          }}
        />
      </div>

      {showText && (
        <div className="flex align-items-center justify-content-between mt-1">
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color }}>{value}%</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-color-secondary)' }}>{remainText}</span>
        </div>
      )}
    </div>
  )
}

export default LifespanBar
