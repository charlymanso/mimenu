import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Sun, Apple, Utensils, Coffee, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekStart } from '../lib/utils'

// Sunday=0 … Saturday=6 — matches new Date().getDay()
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Mon → Sun order for navigation
const ORDERED_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS_FULL = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

const MEALS = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena']

const MEAL_META = {
  desayuno: { label: 'Desayuno',  Icon: Sun      },
  almuerzo: { label: 'Almuerzo',  Icon: Apple    },
  comida:   { label: 'Comida',    Icon: Utensils },
  merienda: { label: 'Merienda',  Icon: Coffee   },
  cena:     { label: 'Cena',      Icon: Moon     },
}

export default function HomePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const weekStart = useMemo(() => getWeekStart(), [])
  const todayKey  = useMemo(() => DAY_KEYS[new Date().getDay()], [])

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Mobile day selection — defaults to today
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const idx = ORDERED_DAYS.indexOf(DAY_KEYS[new Date().getDay()])
    return idx >= 0 ? idx : 0
  })
  const selectedDay = ORDERED_DAYS[selectedDayIdx]

  const { data: profile } = useQuery({
    queryKey: ['profile', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Shares cache with PlannerPage
  const { data: rows = [] } = useQuery({
    queryKey: ['weekly_menu', user.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_menu')
        .select('day, meal, meal_text, done')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
      if (error) throw error
      return data
    },
  })

  // Build meal map for every day of the week
  const allMealsByDay = useMemo(() => {
    const map = {}
    ORDERED_DAYS.forEach(day => { map[day] = {} })
    rows.forEach(({ day, meal, meal_text, done }) => {
      if (map[day]) map[day][meal] = { text: meal_text || null, done: done || false }
    })
    return map
  }, [rows])

  const selectedMealMap = allMealsByDay[selectedDay] ?? {}
  const selectedDoneCount = MEALS.filter(m => selectedMealMap[m]?.done).length

  const displayName = profile?.display_name || ''
  const menuKey = ['weekly_menu', user.id, weekStart]

  const doneMutation = useMutation({
    mutationFn: async ({ meal, done, day }) => {
      const { error } = await supabase
        .from('weekly_menu')
        .update({ done })
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('day', day)
        .eq('meal', meal)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menuKey }),
  })

  return (
    <div className="space-y-6">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {displayName ? `Hola, ${displayName}` : 'Bienvenido'}
        </h1>
        <p className="text-sm text-gray-400 capitalize mt-0.5">{dateStr}</p>
      </div>

      {/* ── Móvil: tarjetas grandes + navegación de días ── */}
      <div className="sm:hidden space-y-3">

        {/* Navegador de días */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDayIdx(i => Math.max(0, i - 1))}
            disabled={selectedDayIdx === 0}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 disabled:opacity-30 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="font-semibold text-gray-800">{DAY_LABELS_FULL[selectedDay]}</p>
            {selectedDay === todayKey && (
              <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Hoy
              </span>
            )}
          </div>

          <button
            onClick={() => setSelectedDayIdx(i => Math.min(6, i + 1))}
            disabled={selectedDayIdx === 6}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 disabled:opacity-30 hover:text-primary-600 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Tarjetas de comida */}
        <div className="space-y-2">
          {MEALS.map(meal => {
            const { label, Icon } = MEAL_META[meal]
            const entry   = selectedMealMap[meal]
            const hasText = !!entry?.text
            const isDone  = entry?.done ?? false

            return (
              <div
                key={meal}
                className={`rounded-2xl p-4 flex items-center gap-4 transition-colors ${
                  isDone   ? 'bg-green-50 border border-green-100' :
                  hasText  ? 'bg-orange-50 border border-orange-100' :
                             'bg-white border border-gray-100 shadow-sm'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDone   ? 'bg-green-100' :
                  hasText  ? 'bg-primary-100' :
                             'bg-gray-50'
                }`}>
                  <Icon size={20} className={
                    isDone   ? 'text-green-600' :
                    hasText  ? 'text-primary-600' :
                               'text-gray-300'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold leading-none mb-1">
                    {label}
                  </p>
                  <p className={`text-sm font-medium leading-snug ${
                    isDone   ? 'line-through text-gray-400' :
                    hasText  ? 'text-gray-800' :
                               'text-gray-300 italic font-normal'
                  }`}>
                    {entry?.text ?? 'Sin planificar'}
                  </p>
                </div>
                {hasText && (
                  <button
                    onClick={() => doneMutation.mutate({ meal, done: !isDone, day: selectedDay })}
                    title={isDone ? 'Desmarcar' : 'Marcar como hecha'}
                    className={`flex-shrink-0 transition-colors ${
                      isDone
                        ? 'text-green-500 hover:text-green-700'
                        : 'text-gray-300 hover:text-green-400'
                    }`}
                  >
                    <CheckCircle2 size={22} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-400">
          {selectedDoneCount} de {MEALS.length} comidas hechas
        </p>
      </div>

      {/* ── Desktop: diseño compacto con navegación de días ── */}
      <div className="hidden sm:block card space-y-1 pb-3">
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDayIdx(i => Math.max(0, i - 1))}
              disabled={selectedDayIdx === 0}
              className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-orange-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-700">{DAY_LABELS_FULL[selectedDay]}</h2>
              {selectedDay === todayKey && (
                <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Hoy
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedDayIdx(i => Math.min(6, i + 1))}
              disabled={selectedDayIdx === 6}
              className="p-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-orange-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-sm text-gray-400">{selectedDoneCount} de {MEALS.length} comidas hechas</span>
        </div>

        {MEALS.map(meal => {
          const { label, Icon } = MEAL_META[meal]
          const entry   = selectedMealMap[meal]
          const hasText = !!entry?.text
          const isDone  = entry?.done ?? false

          return (
            <div
              key={meal}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isDone   ? 'bg-green-50' :
                hasText  ? 'bg-orange-50' :
                           'bg-gray-50'
              }`}
            >
              <Icon
                size={15}
                className={
                  isDone  ? 'text-green-400 flex-shrink-0' :
                  hasText ? 'text-primary-400 flex-shrink-0' :
                            'text-gray-300 flex-shrink-0'
                }
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium leading-none mb-0.5">
                  {label}
                </p>
                <p className={`text-sm font-medium truncate ${
                  isDone  ? 'line-through text-gray-400' :
                  hasText ? 'text-gray-700' :
                            'text-gray-300 italic font-normal'
                }`}>
                  {entry?.text ?? 'Sin planificar'}
                </p>
              </div>
              {hasText && (
                <button
                  onClick={() => doneMutation.mutate({ meal, done: !isDone, day: selectedDay })}
                  title={isDone ? 'Desmarcar' : 'Marcar como hecha'}
                  className={`flex-shrink-0 transition-colors ${
                    isDone
                      ? 'text-green-500 hover:text-green-700'
                      : 'text-primary-200 hover:text-green-400'
                  }`}
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Acceso rápido */}
      <Link
        to="/planner"
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <CalendarDays size={16} />
        Ir al planificador
      </Link>

    </div>
  )
}
