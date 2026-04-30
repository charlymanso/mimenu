import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, X, Clock, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const EMPTY_RECIPE = {
  name: '',
  description: '',
  prep_time: '',
  servings: 2,
  steps: [''],
  ingredients: [{ name: '', quantity: '', unit: '' }],
  photo_url: '',
}

// ── Sub-components ───────────────────────────────────────────

function IngredientRow({ ingredient, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        className="input flex-1"
        placeholder="Ingrediente"
        value={ingredient.name}
        onChange={e => onChange(index, 'name', e.target.value)}
      />
      <input
        className="input w-20"
        placeholder="Cant."
        value={ingredient.quantity}
        onChange={e => onChange(index, 'quantity', e.target.value)}
      />
      <input
        className="input w-16"
        placeholder="Un."
        value={ingredient.unit}
        onChange={e => onChange(index, 'unit', e.target.value)}
      />
      <button onClick={() => onRemove(index)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  )
}

function RecipeModal({ recipe, onSave, onClose, saving }) {
  const [form, setForm] = useState(
    recipe
      ? {
          ...recipe,
          prep_time: recipe.prep_time ?? '',
          steps: recipe.steps?.length ? recipe.steps : [''],
          ingredients: recipe.ingredients?.length
            ? recipe.ingredients
            : [{ name: '', quantity: '', unit: '' }],
        }
      : EMPTY_RECIPE
  )

  const updateIngredient = (i, field, value) => {
    const ingredients = [...form.ingredients]
    ingredients[i] = { ...ingredients[i], [field]: value }
    setForm({ ...form, ingredients })
  }

  const addIngredient = () =>
    setForm({ ...form, ingredients: [...form.ingredients, { name: '', quantity: '', unit: '' }] })

  const removeIngredient = i =>
    setForm({ ...form, ingredients: form.ingredients.filter((_, idx) => idx !== i) })

  const updateStep = (i, value) => {
    const steps = [...form.steps]
    steps[i] = value
    setForm({ ...form, steps })
  }

  const addStep = () => setForm({ ...form, steps: [...form.steps, ''] })
  const removeStep = i => setForm({ ...form, steps: form.steps.filter((_, idx) => idx !== i) })

  const handleSave = () => {
    if (!form.name.trim()) return alert('El nombre es obligatorio')
    onSave({
      ...form,
      prep_time: form.prep_time !== '' ? Number(form.prep_time) : null,
      servings: Number(form.servings) || 2,
      ingredients: form.ingredients.filter(i => i.name.trim()),
      steps: form.steps.filter(s => s.trim()),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            {recipe ? 'Editar receta' : 'Nueva receta'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Pasta carbonara"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tiempo (min)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.prep_time}
                onChange={e => setForm({ ...form, prep_time: e.target.value })}
                placeholder="30"
              />
            </div>
            <div>
              <label className="label">Raciones</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.servings}
                onChange={e => setForm({ ...form, servings: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción breve..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Ingredientes</label>
              <button
                onClick={addIngredient}
                className="text-primary-500 hover:text-primary-700 text-sm font-medium"
              >
                + Añadir
              </button>
            </div>
            <div className="space-y-2">
              {form.ingredients.map((ing, i) => (
                <IngredientRow
                  key={i}
                  ingredient={ing}
                  index={i}
                  onChange={updateIngredient}
                  onRemove={removeIngredient}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Pasos</label>
              <button
                onClick={addStep}
                className="text-primary-500 hover:text-primary-700 text-sm font-medium"
              >
                + Añadir
              </button>
            </div>
            <div className="space-y-2">
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-primary-400 mt-2.5 w-5 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <textarea
                    className="input resize-none flex-1"
                    rows={2}
                    value={step}
                    onChange={e => updateStep(i, e.target.value)}
                    placeholder={`Paso ${i + 1}...`}
                  />
                  <button
                    onClick={() => removeStep(i)}
                    className="text-gray-300 hover:text-red-400 mt-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">URL de foto (opcional)</label>
            <input
              className="input"
              value={form.photo_url}
              onChange={e => setForm({ ...form, photo_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
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

function RecipeCard({ recipe, onEdit, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card">
      <div className="flex gap-3">
        {recipe.photo_url && (
          <img
            src={recipe.photo_url}
            alt={recipe.name}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-800 text-sm">{recipe.name}</h3>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={onEdit} className="text-gray-300 hover:text-primary-500 p-1">
                <Edit2 size={15} />
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="text-gray-300 hover:text-red-500 p-1 disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div className="flex gap-3 mt-1">
            {recipe.prep_time && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={12} /> {recipe.prep_time} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users size={12} /> {recipe.servings} rac.
              </span>
            )}
            <span className="text-xs text-gray-400">
              {recipe.ingredients?.length ?? 0} ingredientes
            </span>
          </div>
          {recipe.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          {recipe.ingredients?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Ingredientes
              </p>
              <ul className="space-y-0.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {ing.quantity} {ing.unit} {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recipe.steps?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Pasos
              </p>
              <ol className="space-y-1">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    <span className="font-medium text-primary-500">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-primary-500 hover:text-primary-700 font-medium"
      >
        {expanded ? 'Ocultar' : 'Ver receta'}
      </button>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────

function DeleteConfirmModal({ recipe, onConfirm, onClose, busy }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-gray-800">¿Eliminar receta?</h3>
          <p className="text-sm text-gray-500">
            Se eliminará <span className="font-medium text-gray-700">"{recipe.name}"</span> permanentemente.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={busy} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {busy ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function RecipesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const queryKey = ['recipes', user.id]

  // ── Fetch ────────────────────────────────────────────────
  const { data: recipes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  // ── Mutations ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async form => {
      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          description: form.description || null,
          prep_time: form.prep_time,
          servings: form.servings,
          photo_url: form.photo_url || null,
          steps: form.steps,
        })
        .select()
        .single()
      if (error) throw error

      if (form.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('ingredients')
          .insert(form.ingredients.map(i => ({
            recipe_id: recipe.id,
            name: i.name,
            quantity: i.quantity || null,
            unit: i.unit || null,
          })))
        if (ingErr) throw ingErr
      }
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }) => {
      const { error } = await supabase
        .from('recipes')
        .update({
          name: form.name.trim(),
          description: form.description || null,
          prep_time: form.prep_time,
          servings: form.servings,
          photo_url: form.photo_url || null,
          steps: form.steps,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error

      const { error: delErr } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', id)
      if (delErr) throw delErr

      if (form.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('ingredients')
          .insert(form.ingredients.map(i => ({
            recipe_id: id,
            name: i.name,
            quantity: i.quantity || null,
            unit: i.unit || null,
          })))
        if (ingErr) throw ingErr
      }
    },
    onSuccess: () => { invalidate(); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: async id => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: id => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: invalidate,
  })

  // ── Handlers ────────────────────────────────────────────
  const closeModal = () => { setShowModal(false); setEditingRecipe(null) }

  const handleSave = form => {
    if (editingRecipe) updateMutation.mutate({ id: editingRecipe.id, form })
    else createMutation.mutate(form)
  }

  const handleEdit = recipe => { setEditingRecipe(recipe); setShowModal(true) }

  const handleDelete = id => {
    const recipe = recipes.find(r => r.id === id)
    setDeleteTarget({ id, name: recipe?.name ?? '' })
  }

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  const saving = createMutation.isPending || updateMutation.isPending

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mis recetas</h1>
          <p className="text-sm text-gray-400">{recipes.length} recetas guardadas</p>
        </div>
        <button
          onClick={() => { setEditingRecipe(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus size={16} className="inline mr-1" />
          Nueva
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          className="input pl-9"
          placeholder="Buscar recetas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-gray-500 font-medium">
            {search ? 'No se encontraron recetas' : 'Aún no tienes recetas'}
          </p>
          {!search && (
            <button
              onClick={() => { setEditingRecipe(null); setShowModal(true) }}
              className="mt-3 btn-primary"
            >
              Crear primera receta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={() => handleEdit(recipe)}
              onDelete={() => handleDelete(recipe.id)}
              deleting={deletingId === recipe.id}
            />
          ))}
        </div>
      )}

      {showModal && (
        <RecipeModal
          recipe={editingRecipe}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          recipe={deleteTarget}
          onConfirm={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
          onClose={() => setDeleteTarget(null)}
          busy={deletingId === deleteTarget.id}
        />
      )}
    </div>
  )
}
