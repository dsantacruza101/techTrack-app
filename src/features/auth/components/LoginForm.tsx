import type { FormEvent } from 'react'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { Divider } from 'primereact/divider'

interface LoginFormProps {
  email: string
  password: string
  error: string
  loading: boolean
  googleLoading: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  onGoogleLogin: () => void
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label
    className="font-mono text-xs"
    style={{ letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-color-secondary)' }}
  >
    {children}
  </label>
)

const LoginForm = ({
  email, password, error, loading, googleLoading,
  onEmailChange, onPasswordChange, onSubmit, onGoogleLogin,
}: LoginFormProps) => {
  const isDisabled = loading || googleLoading

  return (
    <div className="flex flex-column gap-4">

      {/* Google Sign-In */}
      <Button
        type="button"
        label={googleLoading ? '' : 'Continue with Google'}
        icon={googleLoading ? 'pi pi-spin pi-spinner' : 'pi pi-google'}
        severity="secondary"
        outlined
        disabled={isDisabled}
        onClick={onGoogleLogin}
        className="w-full"
      />

      <Divider>
        <span
          className="font-mono text-xs"
          style={{ letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}
        >
          or sign in with email
        </span>
      </Divider>

      {/* Email / Password form */}
      <form onSubmit={onSubmit} className="flex flex-column gap-4">
        <div className="flex flex-column gap-2">
          <FieldLabel>Email address</FieldLabel>
          <InputText
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@school.edu"
            type="email"
            required
            disabled={isDisabled}
            className="w-full"
          />
        </div>

        <div className="flex flex-column gap-2">
          <FieldLabel>Password</FieldLabel>
          <Password
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••"
            feedback={false}
            toggleMask
            required
            disabled={isDisabled}
            inputClassName="w-full"
            className="w-full"
            pt={{ iconField: { root: { className: 'w-full' } } }}
          />
        </div>

        {error && <Message severity="error" text={error} className="w-full" />}

        <Button
          type="submit"
          label={loading ? '' : 'Sign in'}
          icon={loading ? 'pi pi-spin pi-spinner' : undefined}
          disabled={isDisabled}
          className="w-full"
        />
      </form>

    </div>
  )
}

export default LoginForm
