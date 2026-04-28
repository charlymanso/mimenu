import { useState } from 'react'
import { Plus, Trash2, Edit2, AlertTriangle, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const CATEGORIES = [
  'Frutas y verduras', 'Carnes y pescados', 'Lácteos y huevos',
  'Cereales y legumbres', 'Especias y condimentos', 'Otros',
]

const EMPTY_ITEM = { name: '', quantity: '', unit: '', category: 'Otros', running_low: false }

// ── Modal ─────────────────────────────────────────────────────

function PantryModal({ item, onSave, onClose, saving }) {
  const [form, setForm] = useState(
    item ? { ...item, quantity: item.quantity ?? '' } : EMPTY_ITEM
  )

  const handleSave = () => {
    if (!form.name.trim()) return alert('El nombre es obligatorio')
    onSave({ ...form, quantity: form.quantity !== '' ? Number(form.quantity) : null })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            {item ? 'Editar ítem' : 'Añadir a despensa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Tomates"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">Unidad</label>
              <input
                className="input"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                placeholder="kg, g, ud..."
              />
            </div>
          </div>

          <div>
            <label className="label">Categoría</label>
            <select
              className="input"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.running_low}
              onChange={e => setForm({ ...form, running_low: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle size={14} /> Se está acabando
            </span>
          </label>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function PantryPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const queryKey = ['pantry', user.id]

  // ── Fetch ────────────────────────────────────────────────
  const { data: pantryItems = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pantry_items')
        .select('id, user_id, name, quantity, unit, category, running_low, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  // ── Mutations ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async form => {
      const { error } = await supabase
        .from('pantry_items')
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          quantity: form.quantity,
          unit: form.unit || null,
          category: form.category,
          running_low: form.running_low,
        })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }) => {
      const { error } = await supabase
        .from('pantry_items')
        .update({
          name: form.name.trim(),
          quantity: form.quantity,
          unit: form.unit || null,
          category: form.category,
          running_low: form.running_low,
        })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: async id => {
      const { error } = await supabase
        .from('pantry_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: id => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: invalidate,
  })

  const toggleLowMutation = useMutation({
    mutationFn: async ({ id, running_low }) => {
      const { error } = await supabase
        .from('pantry_items')
        .update({ running_low })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // ── Handlers ─────────────────────────────────────────────
  const closeModal = () => { setShowModal(false); setEditingItem(null) }

  const handleSave = form => {
    if (editingItem) updateMutation.mutate({ id: editingItem.id, form })
    else createMutation.mutate(form)
  }

  const handleDelete = id => {
    if (window.confirm('¿Eliminar este ítem?')) deleteMutation.mutate(id)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  // ── Derived ───────────────────────────────────────────────
  const grouped = pantryItems.reduce((acc, item) => {
    const cat = item.category ?? 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const lowItems = pantryItems.filter(i => i.running_low)

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Despensa</h1>
          <p className="text-sm text-gray-400">{pantryItems.length} ítems guardados</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus size={16} className="inline mr-1" /> Añadir
        </button>
      </div>

      {lowItems.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-amber-700 flex items-center gap-1 mb-1">
            <AlertTriangle size={14} /> Se está acabando
          </p>
          <p className="text-sm text-amber-600">{lowItems.map(i => i.name).join(', ')}</p>
        </div>
      )}

      {isError ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-red-500 font-medium">Error al cargar la despensa</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">{error?.message}</p>
          <p className="text-xs text-gray-400 mt-2">
            Asegúrate de haber creado la tabla <code className="bg-gray-100 px-1 rounded">pantry_items</code> en Supabase con RLS habilitado.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : pantryItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500 font-medium">La despensa está vacía</p>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true) }}
            className="mt-3 btn-primary"
          >
            Añadir primer ítem
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`card flex items-center gap-3 transition-colors ${
                      item.running_low ? 'border border-amber-200 bg-amber-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${item.running_low ? 'text-amber-800' : 'text-gray-800'}`}>
                          {item.name}
                        </p>
                        {item.running_low && (
                          <AlertTriangle size={13} className="text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      {(item.quantity != null || item.unit) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.quantity != null ? item.quantity : ''}{item.unit ? ` ${item.unit}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => toggleLowMutation.mutate({ id: item.id, running_low: !item.running_low })}
                        className={`p-1 transition-colors ${
                          item.running_low
                            ? 'text-amber-400 hover:text-gray-400'
                            : 'text-gray-300 hover:text-amber-400'
                        }`}
                        title={item.running_low ? 'Quitar aviso' : 'Marcar como se acaba'}
                      >
                        <AlertTriangle size={15} />
                      </button>
                      <button
                        onClick={() => { setEditingItem(item); setShowModal(true) }}
                        className="text-gray-300 hover:text-primary-500 p-1"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-gray-300 hover:text-red-500 p-1 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PantryModal
          item={editingItem}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  )
}
