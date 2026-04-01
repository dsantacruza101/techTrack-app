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
  const pct = getLifespanPercent(purchaseDate, lifespanYears)
  const value = Math.round(pct * 100)
  
  // Determinamos el color según el mockup: Verde -> Naranja -> Rojo
  const getBarColor = () => {
    if (value >= 90) return '#ef4444' // Rojo crítico
    if (value >= 70) return '#f59e0b' // Naranja/Aging
    return '#22c55e' // Verde saludable
  }

  return (
    <ProgressBar
      value={value}
      showValue={false}
      style={{ height: 4, background: 'var(--surface-border)' }}
      pt={{
        value: { 
          style: { 
            background: getBarColor(), 
            boxShadow: `0 0 8px ${getBarColor()}66` // Efecto glow sutil
          } 
        }
      }}
    />
  )
}

export default LifespanBar
