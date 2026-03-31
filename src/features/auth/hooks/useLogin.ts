import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { AccountDisabledError, AccountNotRegisteredError } from '../types/auth.types'

interface UseLoginReturn {
  email: string
  password: string
  error: string
  loading: boolean
  googleLoading: boolean
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  handleSubmit: (e: FormEvent) => Promise<void>
  handleGoogleLogin: () => Promise<void>
}

/**
 * Encapsulates login form state and submission logic.
 * Keeps LoginForm as a pure UI component. (SRP)
 */
export const useLogin = (): UseLoginReturn => {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const resolveError = (err: unknown): string => {
    if (err instanceof AccountDisabledError) return err.message
    if (err instanceof AccountNotRegisteredError) return err.message
    return 'Invalid email or password. Please try again.'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(resolveError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError(resolveError(err))
    } finally {
      setGoogleLoading(false)
    }
  }

  return {
    email,
    password,
    error,
    loading,
    googleLoading,
    setEmail,
    setPassword,
    handleSubmit,
    handleGoogleLogin,
  }
}
