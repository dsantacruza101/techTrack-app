import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { WorkOrder, WorkOrderFormData } from '../types/workOrder.types'

const COL = 'workOrders'

const toWorkOrder = (id: string, d: Record<string, unknown>): WorkOrder => ({
  id,
  title:      d.title      as string,
  category:   d.category   as string,
  priority:   (d.priority  as WorkOrder['priority']) ?? 'medium',
  status:     (d.status    as WorkOrder['status'])   ?? 'open',
  assignedTo: (d.assignedTo as string) ?? '',
  assetId:       (d.assetId       as string) ?? '',
  dueDate:       (d.dueDate       as Timestamp) ?? null,
  estimatedCost: (d.estimatedCost as number)    ?? 0,
  notes:         (d.notes         as string)    ?? '',
  createdAt:  d.createdAt  as Timestamp,
  updatedAt:  d.updatedAt  as Timestamp,
})

export const workOrderService = {
  subscribeToAll(cb: (items: WorkOrder[]) => void, onError?: () => void): () => void {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => toWorkOrder(d.id, d.data() as Record<string, unknown>))),
      () => { onError?.() },
    )
  },

  async create(data: WorkOrderFormData): Promise<boolean> {
    try {
      await addDoc(collection(db, COL), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return true
    } catch { return false }
  },

  async update(id: string, data: Partial<WorkOrderFormData>): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
      return true
    } catch { return false }
  },

  async updateStatus(id: string, status: WorkOrder['status']): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), { status, updatedAt: serverTimestamp() })
      return true
    } catch { return false }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, COL, id))
      return true
    } catch { return false }
  },
}
