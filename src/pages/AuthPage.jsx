import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setMessage('Revisa tu email para confirmar la cuenta.')
    }

    setLoading(false)
  }

  const toggleMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin')
    setError(null)
    setMessage(null)
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
          <h2 className="font-bold text-lg text-gray-800 mb-1">
            {mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            {mode === 'signin' ? 'Bienvenido de nuevo' : 'Empieza a planificar tu menú'}
          </p>

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

            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading
                ? 'Cargando...'
                : mode === 'signin' ? 'Entrar' : 'Registrarse'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-400 mt-4">
            {mode === 'signin' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={toggleMode} className="text-primary-600 font-medium hover:underline">
              {mode === 'signin' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
