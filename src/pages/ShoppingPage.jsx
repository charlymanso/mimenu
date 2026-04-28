import { useState, useMemo } from 'react'
import { Plus, RefreshCw, CheckSquare, Square, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getWeekStart, guessCategory, normalizeText, stemText, betterName } from '../lib/utils'

const CATEGORY_ICONS = {
  'Frutas y verduras': '🥦',
  'Carnes y pescados': '🥩',
  'Lácteos y huevos': '🥛',
  'Cereales y legumbres': '🌾',
  'Especias y condimentos': '🧂',
  'Otros': '🛒',
}

export default function ShoppingPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const listKey = ['shopping_list', user.id]
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: listKey })

  const weekStart = useMemo(() => getWeekStart(), [])
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '', category: 'Otros' })
  const [showAdd, setShowAdd] = useState(false)
  const [showPantryModal, setShowPantryModal] = useState(false)

  // ── Queries ──────────────────────────────────────────────────
  const { data: shoppingList = [], isLoading: listLoading } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
      if (error) throw error
      return data
    },
  })

  const { data: menuRows = [] } = useQuery({
    queryKey: ['weekly_menu', user.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_menu')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
      if (error) { console.error('[ShoppingPage] weekly_menu error:', error); throw error }
      return data
    },
  })

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, ingredients(*)')
        .eq('user_id', user.id)
      if (error) throw error
      return data
    },
  })

  const { refetch: refetchPantry } = useQuery({
    queryKey: ['pantry_items', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('name, quantity')
        .eq('user_id', user.id)
      if (error) throw error
      return data
    },
  })

  // ── Mutations ────────────────────────────────────────────────

  // Reemplaza toda la lista (delete + insert bulk)
  const generateMutation = useMutation({
    mutationFn: async (items) => {
      const { error: delErr } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', user.id)
      if (delErr) throw delErr
      if (!items.length) return
      const { error: insErr } = await supabase
        .from('shopping_list')
        .insert(items.map(({ name, quantity, unit, category }) => ({
          user_id: user.id,
          name,
          quantity: quantity !== '' && quantity != null ? Number(quantity) : null,
          unit: unit || null,
          category: category || 'Otros',
          checked: false,
          manual: false,
        })))
      if (insErr) throw insErr
    },
    onSuccess: invalidateList,
  })

  const addMutation = useMutation({
    mutationFn: async (item) => {
      const { error } = await supabase
        .from('shopping_list')
        .insert({
          user_id: user.id,
          name: item.name.trim(),
          quantity: item.quantity !== '' ? Number(item.quantity) : null,
          unit: item.unit || null,
          category: item.category || 'Otros',
          checked: false,
          manual: true,
        })
      if (error) throw error
    },
    onSuccess: invalidateList,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, checked }) => {
      const { error } = await supabase
        .from('shopping_list')
        .update({ checked: !checked })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: invalidateList,
  })

  const removeMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: invalidateList,
  })

  const clearCheckedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('user_id', user.id)
        .eq('checked', true)
      if (error) throw error
    },
    onSuccess: invalidateList,
  })

  // ── Generate list from weekly menu ───────────────────────────
  const handleGenerate = async (withPantry) => {
    const ingredientMap = {}
    const freeTextMap = {}

    console.group('[stem] building maps')
    menuRows.forEach(row => {
      const { meal_text, recipe_id } = row
      if (!meal_text && !recipe_id) return

      const recipe = recipe_id
        ? recipes.find(r => r.id === recipe_id)
        : recipes.find(r => normalizeText(r.name) === normalizeText(meal_text))

      if (recipe) {
        recipe.ingredients?.forEach(({ name, quantity, unit }) => {
          if (!name?.trim()) return
          const key = stemText(name)
          console.log(`  ingredient "${name}" -> stem="${key}"`)
          const qty = (quantity !== null && quantity !== '' && quantity !== undefined)
            ? Number(quantity)
            : null
          if (!ingredientMap[key]) {
            ingredientMap[key] = { name, quantity: qty ?? 1, unit: unit || '', category: guessCategory(name) }
          } else {
            ingredientMap[key].name = betterName(ingredientMap[key].name, name)
            ingredientMap[key].quantity = (ingredientMap[key].quantity ?? 0) + (qty ?? 1)
          }
        })
      } else if (meal_text) {
        const text = meal_text.trim()
        if (!text) return
        const key = stemText(text)
        console.log(`  freeText  "${text}" -> stem="${key}"`)
        const prev = freeTextMap[key]
        if (!prev) {
          freeTextMap[key] = { name: text, count: 1 }
        } else {
          freeTextMap[key] = { count: prev.count + 1, name: betterName(prev.name, text) }
        }
      }
    })
    console.groupEnd()

    console.group('[merge] freeText -> ingredientMap')
    for (const [key, { name, count }] of Object.entries(freeTextMap)) {
      if (ingredientMap[key]) {
        console.log(`  "${name}" (stem="${key}") merges into ingredient "${ingredientMap[key].name}" qty ${ingredientMap[key].quantity} + ${count}`)
        ingredientMap[key].name = betterName(ingredientMap[key].name, name)
        ingredientMap[key].quantity = (ingredientMap[key].quantity ?? 0) + count
      } else {
        console.log(`  "${name}" (stem="${key}") -> new entry count=${count}`)
        ingredientMap[key] = {
          name,
          quantity: count > 1 ? count : null,
          unit: count > 1 ? 'ud.' : '',
          category: guessCategory(name),
        }
      }
    }
    console.groupEnd()

    if (withPantry) {
      const { data: freshPantry = [] } = await refetchPantry()
      console.log('pantry raw:', JSON.stringify(freshPantry))
      console.group('[deduct] pantry vs ingredientMap')
      freshPantry.forEach(pantryItem => {
        const deduct = parseFloat(pantryItem.quantity) || 0
        const key = stemText(pantryItem.name)
        const hit = ingredientMap[key]
        console.log(`  "${pantryItem.name}" -> stem="${key}" | hit: ${hit ? `qty=${hit.quantity}` : 'NONE'}`)
        if (hit) {
          hit.quantity = deduct > 0 ? Math.max(0, hit.quantity - deduct) : 0
          console.log(`    deducted ${deduct} -> remaining ${hit.quantity}`)
        }
      })
      console.groupEnd()
    }

    Object.keys(ingredientMap).forEach(k => {
      const q = ingredientMap[k].quantity
      if (q != null && q <= 0) delete ingredientMap[k]
    })

    const items = Object.values(ingredientMap).filter(i => i.quantity == null || i.quantity > 0)
    generateMutation.mutate(items)
  }

  // ── Derived state ────────────────────────────────────────────
  const grouped = shoppingList.reduce((acc, item) => {
    const cat = item.category ?? 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const checked = shoppingList.filter(i => i.checked).length
  const total = shoppingList.length

  const handleAddItem = () => {
    if (!newItem.name.trim()) return
    addMutation.mutate(newItem)
    setNewItem({ name: '', quantity: '', unit: '', category: 'Otros' })
    setShowAdd(false)
  }

  // ── Render ───────────────────────────────────────────────────
  if (listLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Lista de compra</h1>
          <p className="text-sm text-gray-400">{checked} / {total} completados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetchPantry(); setShowPantryModal(true) }}
            disabled={generateMutation.isPending}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <RefreshCw size={14} className={generateMutation.isPending ? 'animate-spin' : ''} />
            Regenerar
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
            <Plus size={16} className="inline" />
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Ítem..."
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              autoFocus
            />
            <input
              className="input w-20"
              placeholder="Cant."
              value={newItem.quantity}
              onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
            />
            <input
              className="input w-16"
              placeholder="Un."
              value={newItem.unit}
              onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="input flex-1"
              value={newItem.category}
              onChange={e => setNewItem({ ...newItem, category: e.target.value })}
            >
              {Object.keys(CATEGORY_ICONS).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={handleAddItem} className="btn-primary text-sm">Añadir</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-500 font-medium">La lista está vacía</p>
          <p className="text-sm text-gray-400 mt-1">
            Asigna recetas al menú semanal y pulsa "Regenerar"
          </p>
        </div>
      ) : (
        <>
          {checked > 0 && (
            <button
              onClick={() => clearCheckedMutation.mutate()}
              className="text-sm text-red-400 hover:text-red-600 mb-3 font-medium"
            >
              Eliminar marcados ({checked})
            </button>
          )}

          <div className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{CATEGORY_ICONS[category] ?? '🛒'}</span>
                  <h2 className="text-sm font-semibold text-gray-600">{category}</h2>
                  <span className="text-xs text-gray-400">({items.length})</span>
                </div>
                <div className="space-y-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                        ${item.checked ? 'bg-gray-50' : 'bg-white border border-gray-100 shadow-sm'}`}
                    >
                      <button
                        onClick={() => toggleMutation.mutate({ id: item.id, checked: item.checked })}
                        className="flex-shrink-0"
                      >
                        {item.checked
                          ? <CheckSquare size={18} className="text-accent-500" />
                          : <Square size={18} className="text-gray-300" />
                        }
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {item.name}
                      </span>
                      {(item.quantity || item.unit) && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {item.quantity} {item.unit}
                        </span>
                      )}
                      <button
                        onClick={() => removeMutation.mutate(item.id)}
                        className="text-gray-200 hover:text-red-400 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showPantryModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <p className="text-base font-semibold text-gray-800 mb-1">Generar lista de compra</p>
            <p className="text-sm text-gray-500 mb-6">
              ¿Descontar los productos que ya tienes en la despensa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPantryModal(false); handleGenerate(false) }}
                className="btn-secondary flex-1"
              >
                No
              </button>
              <button
                onClick={() => { setShowPantryModal(false); handleGenerate(true) }}
                className="btn-primary flex-1"
              >
                Sí, descontar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
