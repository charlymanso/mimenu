import { useState, useEffect } from 'react'

const STORAGE_KEY = 'mimenu-theme'
const SYNC_EVENT  = 'mimenu-theme-change'

function applyTheme(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (theme === 'auto' && prefersDark)
  )
}

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? 'auto'
  )

  // Sync across hook instances (e.g. App + SettingsPage both call useTheme)
  useEffect(() => {
    const handler = (e) => setThemeState(e.detail)
    window.addEventListener(SYNC_EVENT, handler)
    return () => window.removeEventListener(SYNC_EVENT, handler)
  }, [])

  // Apply dark class + manage system preference listener when auto
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (newTheme) => {
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: newTheme }))
  }

  return [theme, setTheme]
}
