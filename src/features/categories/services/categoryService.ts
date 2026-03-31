import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { Category, CategoryFormData } from '../types/category.types'

const COL = 'categories'

/**
 * Abstracts all Firestore operations for categories. (DIP)
 */
export const categoryService = {
  /**
   * Subscribes to active (non-deleted) categories ordered by name.
   * Returns an unsubscribe function.
   */
  subscribeToActive(callback: (categories: Category[]) => void): Unsubscribe {
    const q = query(
      collection(db, COL),
      where('isDeleted', '==', false),
      orderBy('name', 'asc')
    )

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      callback(data)
    })
  },

  /**
   * Subscribes to ALL categories (including soft-deleted) for the management table.
   */
  subscribeToAll(callback: (categories: Category[]) => void): Unsubscribe {
    const q = query(collection(db, COL), orderBy('name', 'asc'))

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      callback(data)
    })
  },

  async create(data: CategoryFormData): Promise<void> {
    await addDoc(collection(db, COL), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  async update(id: string, data: Partial<CategoryFormData>): Promise<void> {
    await updateDoc(doc(db, COL, id), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  },

  /** Soft delete — sets isDeleted: true, never removes the document. */
  async softDelete(id: string): Promise<void> {
    await updateDoc(doc(db, COL, id), {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    })
  },

  /** Restore a soft-deleted category. */
  async restore(id: string): Promise<void> {
    await updateDoc(doc(db, COL, id), {
      isDeleted: false,
      updatedAt: serverTimestamp(),
    })
  },
}
