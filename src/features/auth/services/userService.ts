import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../../../firebase/config'
import type { UserProfile, PendingUser, Role } from '../types/auth.types'

const COL         = 'users'
const PENDING_COL = 'pendingUsers'

/** Real-time subscription to all active user profiles. */
const subscribeToAll = (cb: (users: UserProfile[]) => void): (() => void) => {
  const q = query(collection(db, COL), orderBy('displayName'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as UserProfile))
  })
}

/** Real-time subscription to pending (not yet signed-in) users. */
const subscribeToPending = (cb: (users: PendingUser[]) => void): (() => void) => {
  const q = query(collection(db, PENDING_COL), orderBy('createdAt'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingUser))
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

/** Remove a pending registration. */
const removePending = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, PENDING_COL, id))
    return true
  } catch { return false }
}

/**
 * Registers a user by email before they sign in with Google.
 * Creates a pendingUsers doc. On first Google sign-in the record is promoted
 * to users/{uid} by AuthContext.
 */
const registerByEmail = async (
  data: Pick<PendingUser, 'email' | 'displayName' | 'role'>
): Promise<boolean> => {
  try {
    await addDoc(collection(db, PENDING_COL), { ...data, createdAt: Date.now() })
    return true
  } catch { return false }
}

/** Looks up a pending registration by email. Used by AuthContext on first Google sign-in. */
const findPendingByEmail = async (email: string): Promise<PendingUser | null> => {
  const q = query(collection(db, PENDING_COL), where('email', '==', email))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as PendingUser
}

/**
 * Promotes a pending registration to a full users/{uid} profile.
 * Called by AuthContext on first Google sign-in.
 */
const promotePendingUser = async (
  uid: string,
  pending: PendingUser,
  googleDisplayName?: string | null
): Promise<UserProfile | null> => {
  try {
    const newProfile: UserProfile = {
      uid,
      email: pending.email,
      displayName: pending.displayName || googleDisplayName || pending.email,
      role: pending.role,
      isActive: true,
      permissions: [],
    }
    await setDoc(doc(db, COL, uid), newProfile)
    await deleteDoc(doc(db, PENDING_COL, pending.id))
    return newProfile
  } catch { return null }
}

export const userService = {
  subscribeToAll,
  subscribeToPending,
  setActive,
  setRole,
  remove,
  removePending,
  registerByEmail,
  findPendingByEmail,
  promotePendingUser,
}
