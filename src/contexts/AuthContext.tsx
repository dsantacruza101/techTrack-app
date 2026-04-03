import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { authService } from '../features/auth/services/authService'
import { userService } from '../features/auth/services/userService'
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

      // Hold the loading spinner while we fetch/promote the profile.
      // Without this, interactive sign-in briefly shows loading=false + no profile,
      // causing ProtectedRoute to redirect back to /login.
      setLoading(true)

      let profile = await authService.getUserProfile(user.uid)

      if (!profile) {
        // First Google sign-in: check if an admin pre-registered this email
        const pending = user.email
          ? await userService.findPendingByEmail(user.email)
          : null

        if (pending) {
          profile = await userService.promotePendingUser(user.uid, pending, user.displayName)
        }

        if (!profile) {
          await user.delete()
          setLoading(false)
          return
        }
      }

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
