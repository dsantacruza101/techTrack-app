import type { Timestamp } from 'firebase/firestore'

export type AssetStatus = 'active' | 'maintenance' | 'storage' | 'retired'

export const ASSET_STATUS_OPTIONS: { label: string; value: AssetStatus }[] = [
  { label: 'Active',      value: 'active' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Storage',     value: 'storage' },
  { label: 'Retired',     value: 'retired' },
]

export interface Asset {
  id: string
  name: string
  brand: string
  model: string
  categoryId: string
  subcategoryId: string
  school: string
  status: AssetStatus
  serialNumber: string
  assetTag: string
  purchaseDate: Timestamp
  purchasePrice: number
  estimatedValue: number
  lifespanYears: number
  warrantyExpiry: Timestamp | null
  assignedTo: string
  location: string
  notes: string
  careCompletions: Record<string, Timestamp>
  careCompletionCosts?: Record<string, number>
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AssetFormData = Omit<Asset, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt' | 'careCompletions' | 'careCompletionCosts'>

// ── Lifespan status ───────────────────────────────────────────────
export type LifespanStatus = 'good' | 'aging' | 'replace'

export const getLifespanStatus = (purchaseDate: Timestamp, lifespanYears: number): LifespanStatus => {
  const purchaseMs = purchaseDate.toDate().getTime()
  const totalMs    = lifespanYears * 365.25 * 24 * 60 * 60 * 1000
  const elapsed    = Date.now() - purchaseMs
  const pct        = elapsed / totalMs

  if (pct >= 0.8) return 'replace'
  if (pct >= 0.5) return 'aging'
  return 'good'
}

export const getLifespanPercent = (purchaseDate: Timestamp, lifespanYears: number): number => {
  const purchaseMs = purchaseDate.toDate().getTime()
  const totalMs    = lifespanYears * 365.25 * 24 * 60 * 60 * 1000
  const elapsed    = Date.now() - purchaseMs
  return Math.min(Math.max(elapsed / totalMs, 0), 1)
}

export const LIFESPAN_STATUS_SEVERITY: Record<LifespanStatus, 'success' | 'warning' | 'danger'> = {
  good:    'success',
  aging:   'warning',
  replace: 'danger',
}

export const LIFESPAN_STATUS_LABEL: Record<LifespanStatus, string> = {
  good:    'Good',
  aging:   'Aging',
  replace: 'Replace',
}
