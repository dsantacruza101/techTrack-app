import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { Asset, AssetFormData } from '../types/asset.types'

const COL = 'assets'

const toAsset = (id: string, data: Record<string, unknown>): Asset => ({
  id,
  name:          data.name          as string,
  brand:         data.brand         as string,
  model:         data.model         as string,
  categoryId:    data.categoryId    as string,
  status:        (data.status as Asset['status']) ?? 'active',
  serialNumber:  data.serialNumber  as string,
  assetTag:      data.assetTag      as string,
  purchaseDate:  data.purchaseDate  as Timestamp,
  purchasePrice: data.purchasePrice as number,
  lifespanYears: data.lifespanYears as number,
  assignedTo:    data.assignedTo    as string,
  location:      (data.location     as string) ?? '',
  notes:         data.notes         as string,
  isDeleted:     data.isDeleted     as boolean,
  createdAt:     data.createdAt     as Timestamp,
  updatedAt:     data.updatedAt     as Timestamp,
})

/** Real-time subscription — all assets (including soft-deleted) for the management table. */
const subscribeToAll = (cb: (assets: Asset[]) => void): (() => void) => {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => toAsset(d.id, d.data() as Record<string, unknown>)))
  })
}

/** Real-time subscription — active assets only. */
const subscribeToActive = (cb: (assets: Asset[]) => void): (() => void) => {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => toAsset(d.id, d.data() as Record<string, unknown>))
    cb(all.filter((a) => !a.isDeleted))
  })
}

const create = async (data: AssetFormData): Promise<boolean> => {
  try {
    await addDoc(collection(db, COL), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}

const update = async (id: string, data: Partial<AssetFormData>): Promise<boolean> => {
  try {
    await updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
    return true
  } catch {
    return false
  }
}

const softDelete = async (id: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, COL, id), { isDeleted: true, updatedAt: serverTimestamp() })
    return true
  } catch {
    return false
  }
}

const restore = async (id: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, COL, id), { isDeleted: false, updatedAt: serverTimestamp() })
    return true
  } catch {
    return false
  }
}

/** Duplicate an asset — same fields, new Firestore document. */
const replicate = async (asset: Asset): Promise<boolean> => {
  try {
    await addDoc(collection(db, COL), {
      name:          `${asset.name} (Copy)`,
      brand:         asset.brand,
      model:         asset.model,
      categoryId:    asset.categoryId,
      serialNumber:  '',
      assetTag:      '',
      purchaseDate:  asset.purchaseDate,
      purchasePrice: asset.purchasePrice,
      lifespanYears: asset.lifespanYears,
      assignedTo:    '',
      location:      asset.location,
      notes:         asset.notes,
      isDeleted:     false,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}

export const assetService = {
  subscribeToAll,
  subscribeToActive,
  create,
  update,
  softDelete,
  restore,
  replicate,
}
