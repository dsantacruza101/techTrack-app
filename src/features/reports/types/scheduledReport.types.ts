import type { Timestamp } from 'firebase/firestore'

export type ReportType =
  | 'asset_summary'
  | 'maintenance_due'
  | 'wo_status'
  | 'it_inventory'
  | 'depreciation'

export type ReportFrequency = 'weekly' | 'monthly' | 'quarterly'

export interface ScheduledReport {
  id: string
  reportType: ReportType
  frequency: ReportFrequency
  recipientEmail: string
  createdAt: Timestamp
  createdBy: string
  lastSentAt: Timestamp | null
  nextSendAt: Timestamp
  isActive: boolean
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  asset_summary:   'Asset Summary',
  maintenance_due: 'Maintenance Due',
  wo_status:       'Work Order Status',
  it_inventory:    'IT Asset Inventory',
  depreciation:    'Depreciation Report',
}

export const FREQ_LABELS: Record<ReportFrequency, string> = {
  weekly:    'Weekly',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
}

/** Compute the next send date from now based on frequency */
export const computeNextSendAt = (freq: ReportFrequency): Date => {
  const now = new Date()
  if (freq === 'weekly') {
    const d = new Date(now)
    d.setDate(now.getDate() + 7)
    d.setHours(8, 0, 0, 0)
    return d
  }
  if (freq === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0, 0)
  }
  if (freq === 'quarterly') {
    const nextQ = Math.floor(now.getMonth() / 3) + 1
    const year  = nextQ > 3 ? now.getFullYear() + 1 : now.getFullYear()
    return new Date(year, (nextQ % 4) * 3, 1, 8, 0, 0, 0)
  }
  const d = new Date(now); d.setDate(now.getDate() + 7); return d
}
