import type { Timestamp } from 'firebase/firestore'

export type ColorKey =
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'green'
  | 'yellow'
  | 'red'
  | 'orange'

export type CareFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'asneeded'

export const CARE_FREQUENCY_OPTIONS: { label: string; value: CareFrequency }[] = [
  { label: 'Daily',     value: 'daily'     },
  { label: 'Weekly',    value: 'weekly'    },
  { label: 'Monthly',   value: 'monthly'   },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annually',  value: 'annually'  },
  { label: 'As Needed', value: 'asneeded'  },
]

export interface CareTask {
  id: string
  task: string
  freq: CareFrequency
  description: string
}

export interface Category {
  id: string
  name: string
  icon: string      // PrimeIcon class e.g. 'pi pi-desktop'
  colorKey: ColorKey
  subcategories: string[]
  careTasks: CareTask[]
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type CategoryFormData = Pick<Category, 'name' | 'icon' | 'colorKey' | 'subcategories' | 'careTasks'>

// ── Preset icons ──────────────────────────────────────────────────
export const CATEGORY_ICONS: { value: string; label: string }[] = [
  { value: 'pi pi-desktop',    label: 'Desktop'    },
  { value: 'pi pi-server',     label: 'Server'     },
  { value: 'pi pi-tablet',     label: 'Tablet'     },
  { value: 'pi pi-mobile',     label: 'Mobile'     },
  { value: 'pi pi-video',      label: 'Projector'  },
  { value: 'pi pi-box',        label: 'Box'        },
  { value: 'pi pi-headphones', label: 'Headphones' },
  { value: 'pi pi-camera',     label: 'Camera'     },
  { value: 'pi pi-print',      label: 'Printer'    },
  { value: 'pi pi-wifi',       label: 'Network'    },
  { value: 'pi pi-keyboard',   label: 'Keyboard'   },
  { value: 'pi pi-database',   label: 'Storage'    },
]

// ── Preset colors ─────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<ColorKey, { bg: string; text: string; swatch: string }> = {
  blue:   { bg: 'rgba(79,143,255,0.12)',  text: '#4f8fff', swatch: '#4f8fff' },
  cyan:   { bg: 'rgba(6,182,212,0.12)',   text: '#06b6d4', swatch: '#06b6d4' },
  purple: { bg: 'rgba(124,58,237,0.12)', text: '#7c3aed', swatch: '#7c3aed' },
  green:  { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e', swatch: '#22c55e' },
  yellow: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', swatch: '#f59e0b' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', swatch: '#ef4444' },
  orange: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', swatch: '#f97316' },
}
