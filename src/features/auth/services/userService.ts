import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../../firebase/config'
import type { UserProfile, Role } from '../types/auth.types'

const COL = 'users'

/** Real-time subscription to all user profiles. */
const subscribeToAll = (cb: (users: UserProfile[]) => void): (() => void) => {
  const q = query(collection(db, COL), orderBy('displayName'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as UserProfile))
  })
}

/** Enable or disable a user account. */
const setActive = async (uid: string, isActive: boolean): Promise<boolean> => {
  try {
    await updateDoc(doc(db, COL, uid), { isActive })
    return true
  } catch { return false }
}

/** Change a user's role. */
const setRole = async (uid: string, role: Role): Promise<boolean> => {
  try {
    await updateDoc(doc(db, COL, uid), { role })
    return true
  } catch { return false }
}

/** Remove a user profile from Firestore. Does NOT delete the Firebase Auth account. */
const remove = async (uid: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COL, uid))
    return true
  } catch { return false }
}

/**
 * Calls the `inviteUser` Cloud Function which creates a Firebase Auth account
 * and a Firestore profile with the real UID, then sends a password-reset link.
 */
const createInvite = async (profile: Omit<UserProfile, 'uid' | 'permissions'>): Promise<boolean> => {
  try {
    const fn = httpsCallable(functions, 'inviteUser')
    await fn({
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
    })
    return true
  } catch { return false }
}

export const userService = { subscribeToAll, setActive, setRole, remove, createInvite }
