import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import type { User, Unsubscribe } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../../firebase/config'
import { AccountDisabledError, AccountNotRegisteredError } from '../types/auth.types'
import type { UserProfile } from '../types/auth.types'

const googleProvider = new GoogleAuthProvider()

/**
 * Abstracts all Firebase auth & user-profile operations.
 * Components depend on this interface, not on Firebase directly. (DIP)
 */
export const authService = {
  /**
   * Signs in with email/password then immediately checks user status.
   * Throws AccountDisabledError and signs out if the account is inactive.
   */
  async login(email: string, password: string): Promise<void> {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    const profile = await authService.getUserProfile(user.uid)

    if (profile?.isActive === false) {
      await signOut(auth)
      throw new AccountDisabledError()
    }
  },

  /**
   * Signs in with Google popup.
   * Only allows access if an admin has pre-created a Firestore profile for this email.
   * Throws if the account is not registered or has been disabled.
   */
  async loginWithGoogle(): Promise<void> {
    const { user } = await signInWithPopup(auth, googleProvider)
    const profile = await authService.getUserProfile(user.uid)

    if (!profile) {
      throw new AccountNotRegisteredError()
    }

    if (profile.isActive === false) {
      throw new AccountDisabledError()
    }
  },

  logout() {
    return signOut(auth)
  },

  onAuthChanged(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback)
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  },
}
