import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { authService } from '../features/auth/services/authService'
import type { Role, UserProfile } from '../features/auth/types/auth.types'

interface AuthContextValue {
  currentUser: User | null
  userProfile: UserProfile | null
  role: Role | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Provides auth state to the whole app.
 * Depends on authService abstraction, not on Firebase directly. (DIP)
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.onAuthChanged(async (user) => {
      if (!user) {
        setCurrentUser(null)
        setUserProfile(null)
        setLoading(false)
        return
      }

      const profile = await authService.getUserProfile(user.uid)

      // Unregistered Google user — delete Auth record immediately.
      // Cloud Function blockUnregisteredGoogleUsers acts as server-side backup.
      if (!profile) {
        await user.delete()
        return
      }

      // If an admin disables the user while they have an active session,
      // sign them out so they lose access on next auth state refresh.
      if (profile.isActive === false) {
        await authService.logout()
        return
      }

      setCurrentUser(user)
      setUserProfile(profile)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    await authService.login(email, password)
  }

  const loginWithGoogle = async () => {
    await authService.loginWithGoogle()
  }

  const logout = async () => {
    await authService.logout()
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: userProfile?.role ?? null,
        loading,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
