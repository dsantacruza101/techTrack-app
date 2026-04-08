import type { Timestamp } from 'firebase/firestore'

export type TicketCategory =
  | 'hardware'
  | 'software'
  | 'network'
  | 'account'
  | 'printer'
  | 'setup'
  | 'other'

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketStatus   = 'open' | 'inprogress' | 'resolved' | 'closed'

export const TICKET_CATEGORY_OPTIONS: { label: string; value: TicketCategory }[] = [
  { label: 'Hardware Failure',       value: 'hardware' },
  { label: 'Software Issue',         value: 'software' },
  { label: 'Network / Connectivity', value: 'network'  },
  { label: 'Account / Access',       value: 'account'  },
  { label: 'Printer / Peripheral',   value: 'printer'  },
  { label: 'Setup / Configuration',  value: 'setup'    },
  { label: 'Other',                  value: 'other'    },
]

export const TICKET_PRIORITY_OPTIONS: { label: string; value: TicketPriority }[] = [
  { label: 'Low',      value: 'low'      },
  { label: 'Medium',   value: 'medium'   },
  { label: 'High',     value: 'high'     },
  { label: 'Critical', value: 'critical' },
]

export const TICKET_STATUS_OPTIONS: { label: string; value: TicketStatus }[] = [
  { label: 'Open',        value: 'open'       },
  { label: 'In Progress', value: 'inprogress' },
  { label: 'Resolved',    value: 'resolved'   },
  { label: 'Closed',      value: 'closed'     },
]

export interface ITTicket {
  id: string
  title: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  reportedBy: string
  location: string
  assetId: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ITTicketFormData = Omit<ITTicket, 'id' | 'createdAt' | 'updatedAt'>

export const TICKET_PRIORITY_SEVERITY: Record<TicketPriority, 'danger' | 'warning' | 'info' | 'secondary'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'info',
  low:      'secondary',
}

export const TICKET_STATUS_SEVERITY: Record<TicketStatus, 'info' | 'warning' | 'success' | 'secondary'> = {
  open:       'info',
  inprogress: 'warning',
  resolved:   'success',
  closed:     'secondary',
}
