import type { Timestamp } from 'firebase/firestore'

export interface InventoryItem {
  id: string
  name: string
  categoryId: string
  unit: string
  inStock: number
  lowStockThreshold: number
  notes: string
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type InventoryItemFormData = Omit<InventoryItem, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>

export interface StockLog {
  id: string
  change: number
  note: string
  createdBy: string
  createdAt: Timestamp
}

export const stockStatus = (item: InventoryItem): 'ok' | 'low' | 'out' => {
  if (item.inStock === 0) return 'out'
  if (item.inStock <= item.lowStockThreshold) return 'low'
  return 'ok'
}
