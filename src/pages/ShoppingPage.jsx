import { useState, useMemo } from 'react'
import { Plus, RefreshCw, CheckSquare, Square, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
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
  const {
    shoppingList, setShoppingList,
    addShoppingItem, toggleShoppingItem, removeShoppingItem, clearCheckedItems,
  } = useAppStore()

  const weekStart = useMemo(() => getWeekStart(), [])
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '', category: 'Otros' })
  const [showAdd, setShowAdd] = useState(false)
  const [showPantryModal, setShowPantryModal] = useState(false)

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

  const { data: pantryItems = [], refetch: refetchPantry } = useQuery({
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

  const handleGenerate = async (withPantry) => {
    // stemText key: strips accents + trailing plural 's' so
    // "platano", "plátano", "platanos" all map to the same bucket
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

    // Merge free-text meal occurrences into ingredientMap on the same stem so
    // they aggregate with recipe ingredients and are visible to pantry deduction.
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
      console.log('ingredientMap:')
      Object.entries(ingredientMap).forEach(([k, v]) =>
        console.log(`  stem="${k}" | name="${v.name}" qty=${v.quantity} unit="${v.unit}"`)
      )
      console.log('pantry deduction:')
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

    // Remove any entry whose quantity was deducted to 0 or below.
    Object.keys(ingredientMap).forEach(k => {
      const q = ingredientMap[k].quantity
      if (q != null && q <= 0) delete ingredientMap[k]
    })

    const items = Object.values(ingredientMap)
      .filter(i => i.quantity == null || i.quantity > 0)
      .map(i => ({ ...i, quantity: i.quantity ?? '', id: crypto.randomUUID(), checked: false }))

    setShoppingList(items)
  }

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
    addShoppingItem({ ...newItem, manual: true })
    setNewItem({ name: '', quantity: '', unit: '', category: 'Otros' })
    setShowAdd(false)
  }

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
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <RefreshCw size={14} /> Regenerar
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
              onClick={clearCheckedItems}
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
                      <button onClick={() => toggleShoppingItem(item.id)} className="flex-shrink-0">
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
                        onClick={() => removeShoppingItem(item.id)}
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
