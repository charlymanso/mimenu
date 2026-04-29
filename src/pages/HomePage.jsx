import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, Circle, Sun, Apple, Utensils, Coffee, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekStart } from '../lib/utils'

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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
  const weekStart = useMemo(() => getWeekStart(), [])
  const todayKey  = DAY_KEYS[new Date().getDay()]

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

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

  // Same key as PlannerPage — shares the cache
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

  const mealMap = useMemo(() => {
    const map = {}
    rows
      .filter(r => r.day === todayKey)
      .forEach(({ meal, meal_text, done }) => {
        map[meal] = { text: meal_text || null, done: done || false }
      })
    return map
  }, [rows, todayKey])

  const doneCount = MEALS.filter(m => mealMap[m]?.done).length
  const displayName = profile?.display_name || ''

  return (
    <div className="space-y-6">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {displayName ? `Hola, ${displayName}` : 'Bienvenido'}
        </h1>
        <p className="text-sm text-gray-400 capitalize mt-0.5">{dateStr}</p>
      </div>

      {/* Hoy */}
      <div className="card space-y-1 pb-3">
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Hoy</h2>
          <span className="text-sm text-gray-400">{doneCount} de 5 comidas hechas</span>
        </div>

        {MEALS.map(meal => {
          const { label, Icon } = MEAL_META[meal]
          const entry   = mealMap[meal]
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
              {isDone  && <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />}
              {!isDone && hasText && <Circle size={15} className="text-primary-200 flex-shrink-0" />}
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
