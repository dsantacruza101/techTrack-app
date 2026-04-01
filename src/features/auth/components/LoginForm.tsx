import type { FormEvent } from 'react'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { Button } from 'primereact/button'
import { Message } from 'primereact/message'
import { Divider } from 'primereact/divider'

interface LoginFormProps {
  email: string; password: string; error: string; loading: boolean; googleLoading: boolean;
  onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void; onGoogleLogin: () => void;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="font-mono text-xs uppercase tracking-widest text-white-alpha-40 mb-2 block">
    {children}
  </label>
)

const LoginForm = ({
  email, password, error, loading, googleLoading,
  onEmailChange, onPasswordChange, onSubmit, onGoogleLogin,
}: LoginFormProps) => {
  const isDisabled = loading || googleLoading

  return (
    <div className="flex flex-column gap-3">
      {/* Google Button */}
      <Button
        type="button"
        onClick={onGoogleLogin}
        disabled={isDisabled}
        className="w-full border-round-xl p-3 font-medium justify-content-center"
        style={{ 
          background: 'transparent', 
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)'
        }}
      >
        {googleLoading ? <i className="pi pi-spin pi-spinner mr-2" /> : <i className="pi pi-google mr-3" />}
        <span>Continue with Google</span>
      </Button>

      <Divider align="center" className="my-3">
        <span className="font-mono text-xs uppercase text-white-alpha-20 px-2">or</span>
      </Divider>

      <form onSubmit={onSubmit} className="flex flex-column gap-4">
        {/* Email con icono arreglado */}
        <div className="flex flex-column">
          <FieldLabel>Email Address</FieldLabel>
          <div className="p-input-icon-left w-full">
            {/* <i className="pi pi-envelope text-white-alpha-40" style={{ left: '1rem' }} /> */}
            <InputText
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="name@company.com"
              className="w-full p-3 border-round-xl"
              style={{ paddingLeft: '3rem' }} // Forzamos el espacio para el icono
              required
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Password arreglado */}
        <div className="flex flex-column">
          <FieldLabel>Password</FieldLabel>
          <Password
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="password"
            toggleMask
            feedback={false}
            className="w-full"
            inputClassName="w-full p-3 border-round-xl" // Esto asegura que el input interno tenga el estilo
            disabled={isDisabled}
            // Eliminamos los iconos de Prime para que no se encimen si causan ruido
            pt={{
              showIcon: { className: 'text-white-alpha-40' },
              hideIcon: { className: 'text-white-alpha-40' },
              iconField: { root: { className: 'w-full' } }
            }}
          />
        </div>

        {error && <Message severity="error" text={error} className="w-full border-round-xl" />}

        <Button
          type="submit"
          disabled={isDisabled}
          className="w-full p-3 border-round-xl font-bold text-lg justify-content-center"
          style={{ 
            background: 'var(--primary-color)', 
            border: 'none',
            boxShadow: '0 4px 12px rgba(79, 143, 255, 0.3)' 
          }}
        >
          {loading ? <i className="pi pi-spin pi-spinner mr-2" /> : <i className="pi pi-sign-in mr-2" />}
          <span>Sign In</span>
        </Button>
      </form>
    </div>
  )
}

export default LoginForm