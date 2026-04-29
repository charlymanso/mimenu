import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

// mode: 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode,     setMode]     = useState('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [message,  setMessage]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  const reset = () => { setError(null); setMessage(null) }

  const switchMode = (next) => { setMode(next); reset() }

  const handleSubmit = async e => {
    e.preventDefault()
    reset()
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Si existe una cuenta con ese email, recibirás un enlace de recuperación.')
      }
      setLoading(false)
      return
    }

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setMessage('Revisa tu email para confirmar tu cuenta antes de iniciar sesión.')
    }

    setLoading(false)
  }

  const titles = {
    signin: 'Iniciar sesión',
    signup: 'Crear cuenta',
    forgot: 'Recuperar contraseña',
  }
  const subtitles = {
    signin: 'Bienvenido de nuevo',
    signup: 'Empieza a planificar tu menú',
    forgot: 'Te enviaremos un enlace por email',
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 20 20" width="22" height="22" fill="white" aria-hidden="true">
              <path d="M4 14V10a6 6 0 0 1 12 0v4H4Z" />
              <rect x="3" y="14" width="14" height="3.5" rx="1.75" />
            </svg>
          </div>
          <span className="font-bold text-2xl text-primary-600">MiMenú</span>
        </div>

        <div className="card">
          <h2 className="font-bold text-lg text-gray-800 mb-1">{titles[mode]}</h2>
          <p className="text-sm text-gray-400 mb-5">{subtitles[mode]}</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error   && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Cargando...' : {
                signin: 'Entrar',
                signup: 'Registrarse',
                forgot: 'Enviar enlace',
              }[mode]}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-4 space-y-2 text-center">
            {mode === 'signin' && (
              <>
                <p className="text-sm text-gray-400">
                  ¿No tienes cuenta?{' '}
                  <button onClick={() => switchMode('signup')} className="text-primary-600 font-medium hover:underline">
                    Regístrate
                  </button>
                </p>
                <p className="text-sm">
                  <button onClick={() => switchMode('forgot')} className="text-gray-400 hover:text-primary-600 hover:underline transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </p>
              </>
            )}

            {mode === 'signup' && (
              <p className="text-sm text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => switchMode('signin')} className="text-primary-600 font-medium hover:underline">
                  Inicia sesión
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p className="text-sm text-gray-400">
                <button onClick={() => switchMode('signin')} className="text-primary-600 font-medium hover:underline">
                  Volver al inicio de sesión
                </button>
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
