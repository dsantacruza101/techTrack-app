import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { MapRoom, MapRoomFormData } from '../types/mapRoom.types'

const COL = 'mapRooms'

const toRoom = (id: string, d: Record<string, unknown>): MapRoom => ({
  id,
  label:  d.label  as string,
  icon:   (d.icon  as string) ?? '🏫',
  color:  (d.color as MapRoom['color']) ?? 'blue',
  floor:  (d.floor as string) ?? 'Floor 1',
  x:      (d.x     as number) ?? 0,
  y:      (d.y     as number) ?? 0,
  w:      (d.w     as number) ?? 120,
  h:      (d.h     as number) ?? 80,
})

export const mapRoomService = {
  subscribeToAll(cb: (rooms: MapRoom[]) => void, onError?: () => void): () => void {
    const q = query(collection(db, COL), orderBy('label', 'asc'))
    return onSnapshot(q,
      snap => cb(snap.docs.map(d => toRoom(d.id, d.data() as Record<string, unknown>))),
      () => { onError?.() },
    )
  },

  async create(data: MapRoomFormData): Promise<boolean> {
    try {
      await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
      return true
    } catch { return false }
  },

  async update(id: string, data: Partial<MapRoomFormData>): Promise<boolean> {
    try {
      await updateDoc(doc(db, COL, id), data)
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
