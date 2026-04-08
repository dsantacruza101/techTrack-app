import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { InventoryItem, InventoryItemFormData, StockLog } from '../types/inventory.types'

const COL = 'inventory'

const toItem = (id: string, d: Record<string, unknown>): InventoryItem => ({
  id,
  name:              d.name              as string,
  categoryId:        (d.categoryId       as string) ?? '',
  unit:              (d.unit             as string) ?? 'unit',
  inStock:           (d.inStock          as number) ?? 0,
  lowStockThreshold: (d.lowStockThreshold as number) ?? 5,
  notes:             (d.notes            as string) ?? '',
  isDeleted:         (d.isDeleted        as boolean) ?? false,
  createdAt:         d.createdAt         as Timestamp,
  updatedAt:         d.updatedAt         as Timestamp,
})

export const inventoryService = {
  subscribeToActive(cb: (items: InventoryItem[]) => void, onError?: () => void): () => void {
    const q = query(collection(db, COL), where('isDeleted', '==', false), orderBy('name', 'asc'))
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => toItem(d.id, d.data() as Record<string, unknown>))),
      () => { onError?.() },
    )
  },

  async create(data: InventoryItemFormData): Promise<boolean> {
    try {
      await addDoc(collection(db, COL), {
        ...data,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return true
    } catch { return false }
  },

  async update(id: string, data: Partial<InventoryItemFormData>): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
      return true
    } catch { return false }
  },

  async softDelete(id: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), { isDeleted: true, updatedAt: serverTimestamp() })
      return true
    } catch { return false }
  },

  async logStockChange(itemId: string, change: number, note: string, createdBy: string): Promise<boolean> {
    try {
      const itemRef = doc(db, COL, itemId)
      const logRef  = collection(db, COL, itemId, 'logs')
      const logEntry: Omit<StockLog, 'id'> = {
        change,
        note,
        createdBy,
        createdAt: serverTimestamp() as unknown as Timestamp,
      }
      await Promise.all([
        addDoc(logRef, logEntry),
        updateDoc(itemRef, { updatedAt: serverTimestamp() }),
      ])
      return true
    } catch { return false }
  },
}
