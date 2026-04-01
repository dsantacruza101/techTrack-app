import { useLogin } from '../hooks/useLogin'
import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  const {
    email, password, error, loading, googleLoading,
    setEmail, setPassword, handleSubmit, handleGoogleLogin,
  } = useLogin()

  return (
    <div 
      className="flex align-items-center justify-content-center min-h-screen p-4"
      style={{
        backgroundColor: '#0a0c10',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,143,255,0.15) 0%, transparent 100%),
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)
        `,
        backgroundSize: '100% 100%, 40px 40px', // El 40px define la separación de los puntos
      }}
    >
      <div className="animate-fade-up w-full" style={{ maxWidth: '420px' }}>
        <div 
          className="surface-card p-5 border-round-3xl border-1" 
          style={{ 
            backgroundColor: '#0d1117', // Fondo ligeramente más claro que el principal
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px rgba(0,0,0,0.4)' 
          }}
        >
          {/* Logo y Header se mantienen igual... */}
          <div className="flex flex-column align-items-center mb-5">
            <div className="font-serif font-bold text-3xl tracking-tight text-white-alpha-90">
              Tech<span style={{ color: 'var(--primary-color)' }}>Track</span>
            </div>
            <div className="font-mono mt-1 text-xs uppercase tracking-widest text-white-alpha-30" style={{ fontSize: '9px' }}>
              Asset Management
            </div>
          </div>

          <div className="text-center mb-5">
            <h1 className="font-serif font-semibold text-2xl m-0 mb-2 text-white-alpha-90">
              Welcome back
            </h1>
            <p className="m-0 text-sm text-white-alpha-40">
              Sign in to your account to continue
            </p>
          </div>

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

          <p className="text-center text-xs mt-5 m-0 text-white-alpha-20">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}