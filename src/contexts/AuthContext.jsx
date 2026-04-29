import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,           setUser]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true)
      if (event === 'SIGNED_OUT')        setIsRecoveryMode(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // Force email confirmation: if Supabase auto-creates a session (confirmation disabled),
  // sign out immediately so the user must verify their email before logging in.
  const signUp = async (email, password) => {
    const result = await supabase.auth.signUp({ email, password })
    if (result.data?.session && !result.error) {
      await supabase.auth.signOut()
    }
    return result
  }

  const signOut = () => supabase.auth.signOut()

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    })

  const clearRecoveryMode = () => setIsRecoveryMode(false)

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signUp, signOut,
      resetPassword, isRecoveryMode, clearRecoveryMode,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
