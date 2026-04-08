import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { AppSettings } from '../types/settings.types'
import { DEFAULT_SETTINGS } from '../types/settings.types'

const REF = doc(db, 'settings', 'app')

export const settingsService = {
  subscribe(cb: (s: AppSettings) => void): () => void {
    return onSnapshot(REF, snap => {
      if (snap.exists()) {
        cb({ ...DEFAULT_SETTINGS, ...(snap.data() as AppSettings) })
      } else {
        cb(DEFAULT_SETTINGS)
      }
    })
  },

  async get(): Promise<AppSettings> {
    const snap = await getDoc(REF)
    return snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as AppSettings) } : DEFAULT_SETTINGS
  },

  async save(data: AppSettings): Promise<boolean> {
    try {
      await setDoc(REF, data, { merge: true })
      return true
    } catch { return false }
  },
}
