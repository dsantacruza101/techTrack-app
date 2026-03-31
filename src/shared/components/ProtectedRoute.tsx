import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../features/auth/types/auth.types'
import LoadingScreen from './LoadingScreen'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: Role[]
}

/**
 * Route guard — redirects unauthenticated users to /login.
 * Optionally restricts access by role. (OCP: extend with allowedRoles without modifying)
 */
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { currentUser, role, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!currentUser) return <Navigate to="/login" replace />

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
