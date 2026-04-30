import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready,    setReady]    = useState(false)
  const [invalid,  setInvalid]  = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState(null)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    // Supabase detects #access_token on init and fires PASSWORD_RECOVERY.
    // Register listener first, then check session as fallback for the race
    // where the event fired before this component mounted.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    const hash = new URLSearchParams(window.location.hash.slice(1))
    if (hash.get('type') === 'recovery') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
      })
    } else {
      setInvalid(true)
    }

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setErr('Mínimo 6 caracteres'); return }
    if (password !== confirm) { setErr('Las contraseñas no coinciden'); return }
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setErr(error.message)
    } else {
      setDone(true)
      setTimeout(() => navigate('/home', { replace: true }), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={20} className="text-primary-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura para tu cuenta</p>
        </div>

        {invalid ? (
          <p className="text-sm text-center text-red-500">
            Enlace inválido o expirado. Solicita un nuevo email de recuperación.
          </p>
        ) : !ready ? (
          <div className="flex justify-center py-4">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        ) : done ? (
          <div className="text-center space-y-2 py-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check size={18} className="text-green-600" />
            </div>
            <p className="text-sm text-gray-600">¡Contraseña actualizada! Redirigiendo...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium block mb-1">
                Nueva contraseña
              </label>
              <input
                className="input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide font-medium block mb-1">
                Confirmar contraseña
              </label>
              <input
                className="input"
                type="password"
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
              />
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button
              type="submit"
              disabled={busy || !password}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {busy
                ? <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
