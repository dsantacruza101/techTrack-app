import { ProgressBar } from 'primereact/progressbar'
import type { Timestamp } from 'firebase/firestore'
import { getLifespanPercent, getLifespanStatus } from '../types/asset.types'

interface LifespanBarProps {
  purchaseDate: Timestamp
  lifespanYears: number
}

const COLOR: Record<string, string> = {
  good:    'var(--green-500)',
  aging:   'var(--yellow-500)',
  replace: 'var(--red-500)',
}

const LifespanBar = ({ purchaseDate, lifespanYears }: LifespanBarProps) => {
  const pct    = getLifespanPercent(purchaseDate, lifespanYears)
  const status = getLifespanStatus(purchaseDate, lifespanYears)
  const value  = Math.round(pct * 100)

  return (
    <ProgressBar
      value={value}
      showValue={false}
      style={{ height: 6, borderRadius: 99 }}
      pt={{
        value: { style: { background: COLOR[status], borderRadius: 99 } },
      }}
    />
  )
}

export default LifespanBar
