import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { ITTicket, ITTicketFormData } from '../types/itTicket.types'

const COL = 'itTickets'

const toTicket = (id: string, d: Record<string, unknown>): ITTicket => ({
  id,
  title:       d.title       as string,
  category:    (d.category   as ITTicket['category'])  ?? 'other',
  priority:    (d.priority   as ITTicket['priority'])  ?? 'medium',
  status:      (d.status     as ITTicket['status'])    ?? 'open',
  reportedBy:  (d.reportedBy as string) ?? '',
  location:    (d.location   as string) ?? '',
  assetId:     (d.assetId    as string) ?? '',
  description: (d.description as string) ?? '',
  createdAt:   d.createdAt   as Timestamp,
  updatedAt:   d.updatedAt   as Timestamp,
})

export const itTicketService = {
  subscribeToAll(cb: (items: ITTicket[]) => void, onError?: () => void): () => void {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => toTicket(d.id, d.data() as Record<string, unknown>))),
      () => { onError?.() },
    )
  },

  async create(data: ITTicketFormData): Promise<boolean> {
    try {
      await addDoc(collection(db, COL), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return true
    } catch { return false }
  },

  async update(id: string, data: Partial<ITTicketFormData>): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
      return true
    } catch { return false }
  },
}
