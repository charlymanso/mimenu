import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2, Pencil, Check, X, ChevronDown, ChevronUp, LogOut, Monitor, Sun, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/useTheme'

const APP_VERSION = '1.0.0'

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function FieldLabel({ label, editing, onEdit }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      {!editing && (
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          <Pencil size={12} /> Editar
        </button>
      )}
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

function ReadonlyValue({ children }) {
  return (
    <p className="text-sm text-gray-600 py-2 px-3 bg-gray-50 rounded-lg truncate">
      {children}
    </p>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()

  // ── Profile ───────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [draftName,   setDraftName]   = useState('')
  const [nameEditing, setNameEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [profileOk,  setProfileOk]  = useState(null)
  const [profileErr, setProfileErr] = useState(null)
  const fileRef = useRef()

  const { isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      if (data) {
        setDisplayName(data.display_name ?? '')
        setAvatarPreview(data.avatar_url ?? null)
      }
      return data
    },
  })

  const profileMutation = useMutation({
    mutationFn: async ({ name, file, currentPreview }) => {
      let avatar_url = currentPreview
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
      return { avatar_url, name: name.trim() }
    },
    onSuccess: ({ avatar_url, name }) => {
      setAvatarPreview(avatar_url)
      setAvatarFile(null)
      setDisplayName(name)
      setNameEditing(false)
      setProfileErr(null)
      setProfileOk('Perfil guardado')
      setTimeout(() => setProfileOk(null), 3000)
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    },
    onError: (e) => { setProfileErr(e.message); setProfileOk(null) },
  })

  const saveName = () => profileMutation.mutate({
    name: draftName,
    file: avatarFile,
    currentPreview: avatarPreview,
  })

  const saveAvatar = () => profileMutation.mutate({
    name: displayName,
    file: avatarFile,
    currentPreview: avatarPreview,
  })

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const discardAvatar = () => {
    setAvatarFile(null)
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
  }

  const initials = (displayName || user.email || '?').charAt(0).toUpperCase()

  // ── Account — email ───────────────────────────────────────────
  const [newEmail,     setNewEmail]     = useState('')
  const [emailEditing, setEmailEditing] = useState(false)
  const [emailOk,      setEmailOk]      = useState(null)
  const [emailErr,     setEmailErr]     = useState(null)
  const [emailBusy,    setEmailBusy]    = useState(false)

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return
    setEmailBusy(true); setEmailErr(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    setEmailBusy(false)
    if (error) {
      setEmailErr(error.message)
    } else {
      setEmailOk('Revisa tu email para confirmar el cambio')
      setNewEmail('')
      setEmailEditing(false)
      setTimeout(() => setEmailOk(null), 6000)
    }
  }

  const cancelEmail = () => {
    setEmailEditing(false)
    setNewEmail('')
    setEmailErr(null)
  }

  // ── Account — password ────────────────────────────────────────
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [passwordEditing,  setPasswordEditing]  = useState(false)
  const [passwordOk,       setPasswordOk]       = useState(null)
  const [passwordErr,      setPasswordErr]      = useState(null)
  const [passwordBusy,     setPasswordBusy]     = useState(false)

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { setPasswordErr('Mínimo 6 caracteres'); return }
    if (newPassword !== confirmPassword) { setPasswordErr('Las contraseñas no coinciden'); return }
    setPasswordBusy(true); setPasswordErr(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordBusy(false)
    if (error) {
      setPasswordErr(error.message)
    } else {
      setPasswordOk('Contraseña actualizada')
      setNewPassword(''); setConfirmPassword('')
      setPasswordEditing(false)
      setTimeout(() => setPasswordOk(null), 3000)
    }
  }

  const cancelPassword = () => {
    setPasswordEditing(false)
    setNewPassword(''); setConfirmPassword('')
    setPasswordErr(null)
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

            {/* Nombre */}
            <div className="space-y-2">
              <FieldLabel label="Nombre" editing={nameEditing}
                onEdit={() => { setDraftName(displayName); setNameEditing(true) }} />
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
                  <ReadonlyValue>
                    {displayName || <span className="text-gray-400 italic">Sin nombre</span>}
                  </ReadonlyValue>
                  <Feedback ok={profileOk} err={profileErr} />
                </>
              )}
            </div>
          </>
        )}
      </Section>

      {/* ── Cuenta ── */}
      <Section title="Cuenta">
        {/* Email */}
        <div className="space-y-2">
          <FieldLabel label="Email" editing={emailEditing}
            onEdit={() => setEmailEditing(true)} />
          {emailEditing ? (
            <>
              <input className="input" type="email" placeholder="Nuevo email"
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEmailChange()}
                autoFocus />
              <Feedback ok={emailOk} err={emailErr} />
              <SaveCancel
                onSave={handleEmailChange}
                onCancel={cancelEmail}
                busy={emailBusy}
                disabled={!newEmail.trim()}
              />
            </>
          ) : (
            <>
              <ReadonlyValue>{user.email}</ReadonlyValue>
              <Feedback ok={emailOk} err={emailErr} />
            </>
          )}
        </div>

        {/* Password */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <FieldLabel label="Contraseña" editing={passwordEditing}
            onEdit={() => setPasswordEditing(true)} />
          {passwordEditing ? (
            <>
              <input className="input" type="password" placeholder="Nueva contraseña"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                autoFocus />
              <input className="input" type="password" placeholder="Confirmar contraseña"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordChange()} />
              <Feedback ok={passwordOk} err={passwordErr} />
              <SaveCancel
                onSave={handlePasswordChange}
                onCancel={cancelPassword}
                busy={passwordBusy}
                disabled={!newPassword}
              />
            </>
          ) : (
            <>
              <ReadonlyValue>••••••••</ReadonlyValue>
              <Feedback ok={passwordOk} err={passwordErr} />
            </>
          )}
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
