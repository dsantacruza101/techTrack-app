import { useLogin } from '../hooks/useLogin'
import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  const {
    email, password, error, loading, googleLoading,
    setEmail, setPassword, handleSubmit, handleGoogleLogin,
  } = useLogin()

  return (
    <div
      className="flex align-items-center justify-content-center p-4"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(79,143,255,0.07) 0%, transparent 60%), #0a0c10',
      }}
    >
      <div
        className="animate-fade-up w-full"
        style={{ maxWidth: '420px' }}
      >
        <div
          className="p-5"
          style={{
            background: '#111318',
            border: '1px solid rgba(79, 143, 255, 0.15)',
            borderRadius: '20px',
            boxShadow: '0 0 80px rgba(79,143,255,0.05), 0 32px 64px rgba(0,0,0,0.5)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-column align-items-center mb-5">
            <div
              className="font-serif font-bold"
              style={{ fontSize: '28px', letterSpacing: '-0.5px', color: 'rgba(255,255,255,0.9)' }}
            >
              Tech<span style={{ color: 'var(--primary-color)' }}>Track</span>
            </div>
            <div
              className="font-mono mt-2"
              style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}
            >
              Asset Management
            </div>
          </div>

          {/* Header */}
          <div className="flex flex-column align-items-center mb-4">
            <h1
              className="font-serif font-semibold m-0 mb-2"
              style={{ fontSize: '22px', color: 'rgba(255,255,255,0.9)' }}
            >
              Welcome back
            </h1>
            <p className="m-0 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <LoginForm
            email={email}
            password={password}
            error={error}
            loading={loading}
            googleLoading={googleLoading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            onGoogleLogin={handleGoogleLogin}
          />

          {/* Footer */}
          <p className="text-center text-xs mt-4 m-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
