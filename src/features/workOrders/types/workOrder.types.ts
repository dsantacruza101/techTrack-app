import type { Timestamp } from 'firebase/firestore'

export type WOPriority = 'critical' | 'high' | 'medium' | 'low'
export type WOStatus   = 'open' | 'inprogress' | 'completed' | 'onhold' | 'cancelled'

export const WO_PRIORITY_OPTIONS: { label: string; value: WOPriority }[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'High',     value: 'high'     },
  { label: 'Medium',   value: 'medium'   },
  { label: 'Low',      value: 'low'      },
]

export const WO_STATUS_OPTIONS: { label: string; value: WOStatus }[] = [
  { label: 'Open',        value: 'open'       },
  { label: 'In Progress', value: 'inprogress' },
  { label: 'Completed',   value: 'completed'  },
  { label: 'On Hold',     value: 'onhold'     },
  { label: 'Cancelled',   value: 'cancelled'  },
]

export interface WorkOrder {
  id: string
  title: string
  category: string
  priority: WOPriority
  status: WOStatus
  assignedTo: string
  assetId: string
  dueDate: Timestamp | null
  estimatedCost: number
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WorkOrderFormData = Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>

export const WO_PRIORITY_SEVERITY: Record<WOPriority, 'danger' | 'warning' | 'info' | 'secondary'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'info',
  low:      'secondary',
}

export const WO_STATUS_SEVERITY: Record<WOStatus, 'danger' | 'warning' | 'success' | 'info' | 'secondary'> = {
  open:       'info',
  inprogress: 'warning',
  completed:  'success',
  onhold:     'secondary',
  cancelled:  'danger',
}

export const WO_STATUS_LABEL: Record<WOStatus, string> = {
  open:       'Open',
  inprogress: 'In Progress',
  completed:  'Completed',
  onhold:     'On Hold',
  cancelled:  'Cancelled',
}
