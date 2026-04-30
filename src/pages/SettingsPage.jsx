import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2, Pencil, Check, X, ChevronDown, ChevronUp, LogOut, Monitor, Sun, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'
import { translateAuthError } from '../lib/authErrors'

const APP_VERSION = '1.0.0'

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function SaveCancel({ onSave, onCancel, busy, disabled }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onSave}
        disabled={busy || disabled}
        className="btn-primary text-sm flex items-center gap-1.5"
      >
        {busy
          ? <><Loader2 size={13} className="animate-spin" /> Guardando...</>
          : <><Check size={13} /> Guardar</>}
      </button>
      <button
        onClick={onCancel}
        disabled={busy}
        className="btn-secondary text-sm flex items-center gap-1.5"
      >
        <X size={13} /> Cancelar
      </button>
    </div>
  )
}

function Feedback({ ok, err }) {
  if (ok)  return <p className="text-sm text-accent-600">{ok}</p>
  if (err) return <p className="text-sm text-red-500">{err}</p>
  return null
}

export default function SettingsPage() {
  const { user, signOut, resetPassword } = useAuth()
  const queryClient = useQueryClient()

  // ── Profile ───────────────────────────────────────────────────
  const [draftName,   setDraftName]   = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [profileOk,  setProfileOk]  = useState(null)
  const [profileErr, setProfileErr] = useState(null)
  const fileRef = useRef()

  const { isLoading: profileLoading, data: profileData } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const displayName = profileData?.display_name ?? ''

  useEffect(() => {
    if (!avatarFile) setAvatarPreview(profileData?.avatar_url ?? null)
  }, [profileData?.avatar_url]) // eslint-disable-line react-hooks/exhaustive-deps

  const profileMutation = useMutation({
    mutationFn: async ({ name, file, serverAvatarUrl }) => {
      let avatar_url = serverAvatarUrl
      if (file) {
        const ext  = file.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true })
        if (upErr) throw new Error('No se pudo subir la imagen. Comprueba que existe el bucket "avatars" en Supabase Storage.')
        avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, display_name: name.trim() || null, avatar_url })
      if (error) throw error
    },
    onSuccess: () => {
      setAvatarFile(null)
      setNameEditing(false)
      setProfileErr(null)
      setProfileOk('Perfil guardado')
      setTimeout(() => setProfileOk(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    },
    onError: (e) => { setProfileErr(translateAuthError(e.message)); setProfileOk(null) },
  })

  const saveName = () => profileMutation.mutate({
    name: draftName,
    file: avatarFile,
    serverAvatarUrl: profileData?.avatar_url ?? null,
  })

  const saveAvatar = () => profileMutation.mutate({
    name: displayName,
    file: avatarFile,
    serverAvatarUrl: profileData?.avatar_url ?? null,
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const discardAvatar = () => {
    setAvatarFile(null)
  }

  const initials = (displayName || user.email || '?').charAt(0).toUpperCase()

  // ── Password reset ────────────────────────────────────────────
  const [pwResetOk,   setPwResetOk]   = useState(null)
  const [pwResetErr,  setPwResetErr]  = useState(null)
  const [pwResetBusy, setPwResetBusy] = useState(false)

  const handlePasswordReset = async () => {
    setPwResetBusy(true)
    setPwResetErr(null)
    const { error } = await resetPassword(user.email)
    setPwResetBusy(false)
    if (error) {
      setPwResetErr(translateAuthError(error.message))
    } else {
      setPwResetOk('Te hemos enviado un email para cambiar la contraseña')
      setTimeout(() => setPwResetOk(null), 6000)
    }
  }

  // ── Theme ─────────────────────────────────────────────────────
  const [theme, setTheme] = useTheme()

  // ── About — accordion ─────────────────────────────────────────
  const [legalOpen, setLegalOpen] = useState(null)
  const toggleLegal = (key) => setLegalOpen(prev => prev === key ? null : key)

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-gray-800">Ajustes</h1>

      {/* ── Perfil ── */}
      <Section title="Perfil">
        {profileLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar"
                    className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:border-primary-400 transition-colors"
                >
                  <Camera size={13} className="text-gray-500" />
                </button>
                <input ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-700 truncate">{displayName || 'Sin nombre'}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                {avatarFile && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveAvatar}
                      disabled={profileMutation.isPending}
                      className="btn-primary text-xs flex items-center gap-1"
                    >
                      {profileMutation.isPending
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Check size={11} />}
                      Guardar foto
                    </button>
                    <button
                      onClick={discardAvatar}
                      disabled={profileMutation.isPending}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <X size={11} /> Descartar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre — inline pencil edit */}
            <div className="space-y-2">
              {nameEditing ? (
                <>
                  <input className="input" placeholder="Tu nombre"
                    value={draftName} onChange={e => setDraftName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    autoFocus />
                  <Feedback ok={profileOk} err={profileErr} />
                  <SaveCancel
                    onSave={saveName}
                    onCancel={() => { setNameEditing(false); setProfileErr(null) }}
                    busy={profileMutation.isPending}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {displayName || <span className="text-gray-400 italic">Sin nombre</span>}
                    </span>
                    <button
                      onClick={() => { setDraftName(displayName); setNameEditing(true) }}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      aria-label="Editar nombre"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  <Feedback ok={profileOk} err={profileErr} />
                </>
              )}
            </div>
          </>
        )}
      </Section>

      {/* ── Cuenta ── */}
      <Section title="Cuenta">
        {/* Email — solo lectura */}
        <div className="space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Email</p>
          <p className="text-sm text-gray-700">{user.email}</p>
        </div>

        {/* Contraseña — botón de recuperación */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <button
            onClick={handlePasswordReset}
            disabled={pwResetBusy}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {pwResetBusy && <Loader2 size={13} className="animate-spin" />}
            Cambiar contraseña
          </button>
          <Feedback ok={pwResetOk} err={pwResetErr} />
        </div>
      </Section>

      {/* ── Apariencia ── */}
      <Section title="Apariencia">
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Tema</p>
          {[
            { value: 'auto',  label: 'Automático', desc: 'Según el sistema', Icon: Monitor },
            { value: 'light', label: 'Claro',       desc: null,               Icon: Sun     },
            { value: 'dark',  label: 'Oscuro',      desc: null,               Icon: Moon    },
          ].map(({ value, label, desc, Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                  active
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <Icon size={16} className={active ? 'text-primary-600' : 'text-gray-400'} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${active ? 'text-primary-700' : 'text-gray-700'}`}>
                    {label}
                  </p>
                  {desc && <p className="text-xs text-gray-400">{desc}</p>}
                </div>
                {active && <Check size={15} className="text-primary-500 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── Sobre la app ── */}
      <Section title="Sobre MiMenú">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Versión</span>
          <span className="font-medium text-gray-700">{APP_VERSION}</span>
        </div>

        {[
          {
            key: 'terms',
            label: 'Términos de uso',
            content: [
              'MiMenú es una aplicación de planificación de menús para uso personal.',
              'Al usar la app aceptas que los datos introducidos son de tu responsabilidad. No nos hacemos responsables de errores en cantidades o ingredientes.',
              'Nos reservamos el derecho de modificar estos términos en cualquier momento notificando a los usuarios.',
            ],
          },
          {
            key: 'privacy',
            label: 'Política de privacidad',
            content: [
              'Recopilamos únicamente los datos necesarios para el funcionamiento de la app: email, nombre y foto de perfil (opcionales), menú semanal, despensa y lista de compra.',
              'Tus datos se almacenan de forma segura mediante Supabase. No los compartimos con terceros ni los usamos para publicidad.',
              'Puedes solicitar la eliminación de tu cuenta y todos tus datos contactando con nosotros.',
            ],
          },
        ].map(({ key, label, content }) => (
          <div key={key} className="border-t border-gray-100 pt-3">
            <button
              onClick={() => toggleLegal(key)}
              className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span>{label}</span>
              {legalOpen === key ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {legalOpen === key && (
              <div className="mt-3 space-y-2">
                {content.map((p, i) => (
                  <p key={i} className="text-xs text-gray-500 leading-relaxed">{p}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* ── Cerrar sesión ── */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors font-medium text-sm"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  )
}
