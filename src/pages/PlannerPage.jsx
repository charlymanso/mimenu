import { useState, useMemo } from 'react'
import { X, Copy, Clipboard, Loader2, History, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { correctSpelling } from '../lib/claude'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MEALS } from '../store/useAppStore'
import { getWeekStart, getPrevWeekStart, getNextWeekStart } from '../lib/utils'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS = {
  monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié',
  thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom',
}

const DAY_LABELS_FULL = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

const MEAL_LABELS = {
  desayuno: 'Desayuno', almuerzo: 'Almuerzo', comida: 'Comida',
  merienda: 'Merienda', cena: 'Cena',
}

// ── Slot modal ────────────────────────────────────────────────

function SlotModal({ day, meal, current, recipes, clipboard, onSave, onClose }) {
  const [mode, setMode] = useState('text')
  const [text, setText] = useState(current || '')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const save = (value, recipeId = null) => { onSave(value.trim(), recipeId); onClose() }

  const saveText = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const corrected = await correctSpelling(trimmed)
      onSave(corrected, null)
      onClose()
    } catch {
      onSave(trimmed, null)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">{MEAL_LABELS[meal]}</h3>
            <p className="text-xs text-gray-400">{DAY_LABELS_FULL[day]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'text',   label: 'Texto libre' },
            { key: 'recipe', label: 'Elegir receta' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                mode === tab.key
                  ? 'text-primary-600 border-primary-500'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Paste quick action */}
        {clipboard && (
          <button
            onClick={() => save(clipboard.text)}
            className="w-full px-4 py-2.5 flex items-center gap-2 bg-primary-50 hover:bg-primary-100 transition-colors border-b border-primary-100 text-left"
          >
            <Clipboard size={14} className="text-primary-400 flex-shrink-0" />
            <span className="text-sm text-primary-700 truncate">
              Pegar: <span className="font-semibold">{clipboard.text}</span>
            </span>
          </button>
        )}

        {/* Text mode */}
        {mode === 'text' && (
          <div className="p-4 space-y-3">
            <textarea
              className="input w-full resize-none"
              placeholder="¿Qué vas a comer?"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveText()
                if (e.key === 'Escape') onClose()
              }}
              autoFocus
              disabled={saving}
            />
            <div className="flex gap-2">
              <button onClick={onClose} disabled={saving} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveText} disabled={saving || !text.trim()} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Corrigiendo…</> : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Recipe mode */}
        {mode === 'recipe' && (
          <div className="p-3 space-y-2">
            <input
              className="input"
              placeholder="Buscar receta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-56 overflow-y-auto space-y-0.5 pb-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {recipes.length === 0
                    ? 'No hay recetas. ¡Crea alguna primero!'
                    : 'Sin resultados'}
                </p>
              ) : (
                filtered.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => save(recipe.name, recipe.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-gray-700">{recipe.name}</span>
                    {recipe.prep_time && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {recipe.prep_time} min
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Meal slot ─────────────────────────────────────────────────

function MealSlot({ day, meal, text, done, onSave, onClear, onCopy, onToggleDone, clipboard, recipes }) {
  const [open, setOpen] = useState(false)

  const handleSave = (value, recipeId = null) => {
    if (value) onSave(value, recipeId)
    else onClear()
  }

  return (
    <>
      <div
        className={`relative min-h-[52px] rounded-lg border-2 border-dashed cursor-pointer transition-all
          ${text
            ? done
              ? 'border-transparent bg-green-50'
              : 'border-transparent bg-primary-50'
            : 'border-gray-200 hover:border-primary-300 hover:bg-orange-50'
          }`}
        onClick={() => setOpen(true)}
      >
        {text ? (
          <div className="p-2 pr-11 pb-5">
            <p className={`text-xs font-semibold leading-tight ${done ? 'text-green-700' : 'text-primary-700'}`}>
              {text}
            </p>
            {/* Copy */}
            <button
              onClick={e => { e.stopPropagation(); onCopy() }}
              title="Copiar"
              className={`absolute top-1 right-5 transition-colors ${done ? 'text-green-200 hover:text-green-500' : 'text-primary-200 hover:text-primary-500'}`}
            >
              <Copy size={13} />
            </button>
            {/* Clear */}
            <button
              onClick={e => { e.stopPropagation(); onClear() }}
              className={`absolute top-1 right-1 transition-colors ${done ? 'text-green-300 hover:text-green-600' : 'text-primary-300 hover:text-primary-600'}`}
            >
              <X size={14} />
            </button>
            {/* Done toggle */}
            <button
              onClick={e => { e.stopPropagation(); onToggleDone() }}
              title={done ? 'Marcar como pendiente' : 'Marcar como hecha'}
              className={`absolute bottom-1 right-1 transition-colors ${done ? 'text-green-500 hover:text-green-700' : 'text-primary-200 hover:text-green-400'}`}
            >
              <CheckCircle2 size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[52px] gap-1">
            {clipboard ? (
              <>
                <Clipboard size={12} className="text-primary-300" />
                <span className="text-[10px] text-primary-300 font-medium uppercase tracking-wide">
                  Pegar
                </span>
              </>
            ) : (
              <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide">
                + Añadir
              </span>
            )}
          </div>
        )}
      </div>

      {open && (
        <SlotModal
          day={day}
          meal={meal}
          current={text}
          recipes={recipes}
          clipboard={clipboard}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatWeekRange(weekStartStr) {
  const [y, m, d] = weekStartStr.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end   = new Date(y, m - 1, d + 6)
  const sm = start.getMonth(), em = end.getMonth()
  return sm === em
    ? `del ${start.getDate()} al ${end.getDate()} de ${MONTHS[em]}`
    : `del ${start.getDate()} de ${MONTHS[sm]} al ${end.getDate()} de ${MONTHS[em]}`
}

export default function PlannerPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const currentWeekStart = useMemo(() => getWeekStart(), [])
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const isCurrentWeek = weekStart === currentWeekStart

  const menuKey = ['weekly_menu', user.id, weekStart]

  const [clipboard, setClipboard] = useState(null)
  const [importStatus, setImportStatus] = useState(null) // null | 'empty' | 'ok'

  // ── Queries ──────────────────────────────────────────────
  const { data: rows = [], isLoading } = useQuery({
    queryKey: menuKey,
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

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, prep_time, ingredients(*)')
        .eq('user_id', user.id)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const weeklyMenu = useMemo(() => {
    const base = DAYS.reduce((acc, day) => {
      acc[day] = MEALS.reduce((m, meal) => { m[meal] = null; return m }, {})
      return acc
    }, {})
    rows.forEach(({ day, meal, meal_text }) => {
      if (base[day]) base[day][meal] = meal_text || null
    })
    return base
  }, [rows])

  const doneMap = useMemo(() => {
    const map = {}
    rows.forEach(({ day, meal, done }) => {
      if (!map[day]) map[day] = {}
      map[day][meal] = done || false
    })
    return map
  }, [rows])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: menuKey })

  // ── Mutations ────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ day, meal, text, recipeId = null }) => {
      const { error } = await supabase
        .from('weekly_menu')
        .upsert(
          { user_id: user.id, week_start: weekStart, day, meal, meal_text: text, recipe_id: recipeId },
          { onConflict: 'user_id,week_start,day,meal' }
        )
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const clearMutation = useMutation({
    mutationFn: async ({ day, meal }) => {
      const { error } = await supabase
        .from('weekly_menu')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('day', day)
        .eq('meal', meal)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const importPrevMutation = useMutation({
    mutationFn: async () => {
      const prevWeekStart = getPrevWeekStart(weekStart)
      const { data: prevRows, error } = await supabase
        .from('weekly_menu')
        .select('day, meal, meal_text, recipe_id')
        .eq('user_id', user.id)
        .eq('week_start', prevWeekStart)
        .not('meal_text', 'is', null)
      if (error) throw error
      if (!prevRows.length) return 0
      const { error: upsertError } = await supabase
        .from('weekly_menu')
        .upsert(
          prevRows.map(({ day, meal, meal_text, recipe_id }) => ({
            user_id: user.id,
            week_start: weekStart,
            day,
            meal,
            meal_text,
            recipe_id,
          })),
          { onConflict: 'user_id,week_start,day,meal' }
        )
      if (upsertError) throw upsertError
      return prevRows.length
    },
    onSuccess: (count) => {
      if (count === 0) {
        setImportStatus('empty')
      } else {
        setImportStatus('ok')
        invalidate()
      }
      setTimeout(() => setImportStatus(null), 3000)
    },
  })

  const doneMutation = useMutation({
    mutationFn: async ({ day, meal, done }) => {
      const { error } = await supabase
        .from('weekly_menu')
        .update({ done })
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .eq('day', day)
        .eq('meal', meal)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('weekly_menu')
        .delete()
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // ── Render ────────────────────────────────────────────────
  const totalSlots = DAYS.length * MEALS.length

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Menú semanal</h1>
          <p className="text-sm text-gray-400">{rows.length} de {totalSlots} comidas programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => importPrevMutation.mutate()}
            disabled={importPrevMutation.isPending}
            className="btn-secondary text-sm flex items-center gap-1.5"
            title="Importar semana anterior"
          >
            {importPrevMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <History size={14} />
            }
            <span className="hidden sm:inline">Sem. anterior</span>
          </button>
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="btn-secondary text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-orange-100 shadow-sm px-3 py-2">
        <button
          onClick={() => setWeekStart(w => getPrevWeekStart(w))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-orange-50 transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{formatWeekRange(weekStart)}</p>
          {isCurrentWeek && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full mt-0.5">
              Hoy
            </span>
          )}
        </div>

        <button
          onClick={() => setWeekStart(w => getNextWeekStart(w))}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-orange-50 transition-colors"
          aria-label="Semana siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Import feedback */}
      {importStatus === 'empty' && (
        <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
          La semana anterior no tiene datos
        </div>
      )}
      {importStatus === 'ok' && (
        <div className="mb-3 px-3 py-2 bg-accent-50 rounded-lg text-sm text-accent-700 text-center">
          Semana anterior importada
        </div>
      )}

      {/* Clipboard indicator */}
      {clipboard && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary-50 rounded-lg">
          <Clipboard size={14} className="text-primary-400 flex-shrink-0" />
          <span className="text-sm text-primary-700 flex-1 truncate">
            Copiado: <span className="font-semibold">{clipboard.text}</span>
          </span>
          <button
            onClick={() => setClipboard(null)}
            className="text-primary-300 hover:text-primary-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Desktop grid */}
      <div className="hidden sm:grid sm:grid-cols-7 gap-2">
        {DAYS.map(day => (
          <div key={day} className="card p-3 space-y-2">
            <p className="text-center font-semibold text-gray-600 text-sm">{DAY_LABELS[day]}</p>
            {MEALS.map(meal => (
              <div key={meal} className="space-y-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
                  {MEAL_LABELS[meal]}
                </p>
                <MealSlot
                  day={day}
                  meal={meal}
                  text={weeklyMenu[day][meal]}
                  done={doneMap[day]?.[meal] ?? false}
                  onSave={(text, recipeId) => saveMutation.mutate({ day, meal, text, recipeId })}
                  onClear={() => clearMutation.mutate({ day, meal })}
                  onCopy={() => setClipboard({ text: weeklyMenu[day][meal] })}
                  onToggleDone={() => doneMutation.mutate({ day, meal, done: !(doneMap[day]?.[meal] ?? false) })}
                  clipboard={clipboard}
                  recipes={recipes}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-3">
        {DAYS.map(day => (
          <div key={day} className="card">
            <p className="font-semibold text-gray-700 mb-3">{DAY_LABELS[day]}</p>
            <div className="grid grid-cols-2 gap-3">
              {MEALS.map(meal => (
                <div key={meal}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">
                    {MEAL_LABELS[meal]}
                  </p>
                  <MealSlot
                    day={day}
                    meal={meal}
                    text={weeklyMenu[day][meal]}
                    done={doneMap[day]?.[meal] ?? false}
                    onSave={(text, recipeId) => saveMutation.mutate({ day, meal, text, recipeId })}
                    onClear={() => clearMutation.mutate({ day, meal })}
                    onCopy={() => setClipboard({ text: weeklyMenu[day][meal] })}
                    onToggleDone={() => doneMutation.mutate({ day, meal, done: !(doneMap[day]?.[meal] ?? false) })}
                    clipboard={clipboard}
                    recipes={recipes}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
