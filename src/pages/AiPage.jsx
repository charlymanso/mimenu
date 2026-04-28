import { useState } from 'react'
import { Sparkles, ChefHat, Calendar, Plus, Loader2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { suggestRecipesFromPantry, completeWeeklyMenu } from '../lib/claude'

function SuggestedRecipeCard({ recipe, onAdd }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card border-l-4 border-l-primary-400">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">{recipe.name}</h3>
          {recipe.prep_time && (
            <p className="text-xs text-gray-400 mt-0.5">{recipe.prep_time} min de preparación</p>
          )}
        </div>
        <button onClick={onAdd} className="btn-primary text-xs flex-shrink-0 flex items-center gap-1">
          <Plus size={13} /> Guardar
        </button>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-primary-500 hover:text-primary-700 font-medium"
      >
        {expanded ? 'Ocultar detalle' : 'Ver ingredientes y pasos'}
      </button>

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
    </div>
  )
}

export default function AiPage() {
  const { pantryItems, recipes, weeklyMenu, addRecipe, setMealSlot } = useAppStore()

  const [suggestedRecipes, setSuggestedRecipes] = useState([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [error, setError] = useState(null)
  const [completedMenu, setCompletedMenu] = useState(null)

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const handleSuggestRecipes = async () => {
    if (!apiKey) {
      setError('Falta VITE_ANTHROPIC_API_KEY en el .env')
      return
    }
    if (pantryItems.length === 0) {
      setError('Añade ítems a tu despensa primero')
      return
    }
    setLoadingSuggest(true)
    setError(null)
    try {
      const result = await suggestRecipesFromPantry(pantryItems)
      setSuggestedRecipes(result.recipes ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingSuggest(false)
    }
  }

  const handleCompleteMenu = async () => {
    if (!apiKey) {
      setError('Falta VITE_ANTHROPIC_API_KEY en el .env')
      return
    }
    if (recipes.length === 0) {
      setError('Necesitas tener recetas guardadas primero')
      return
    }
    setLoadingComplete(true)
    setError(null)
    try {
      const result = await completeWeeklyMenu(weeklyMenu, pantryItems, recipes)
      setCompletedMenu(result.menu)

      // Apply to store
      Object.entries(result.menu).forEach(([day, meals]) => {
        ;['lunch', 'dinner'].forEach(meal => {
          if (meals[meal]) {
            const recipe = recipes.find(
              r => r.name.toLowerCase() === meals[meal].toLowerCase()
            )
            if (recipe) setMealSlot(day, meal, recipe.id)
          }
        })
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingComplete(false)
    }
  }

  const handleSaveRecipe = recipe => {
    addRecipe(recipe)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles size={20} className="text-primary-500" /> Sugerencias con IA
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Claude analiza tu despensa y te sugiere recetas
        </p>
      </div>

      {!apiKey && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-700">Configuración requerida</p>
          <p className="text-sm text-amber-600 mt-1">
            Añade <code className="bg-amber-100 px-1 rounded">VITE_ANTHROPIC_API_KEY</code> a tu
            archivo <code className="bg-amber-100 px-1 rounded">.env</code> para usar la IA.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Suggest recipes */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <ChefHat size={20} className="text-primary-500" />
            <h2 className="font-semibold text-gray-700">Sugerir recetas</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Basado en los {pantryItems.length} ingredientes de tu despensa, Claude sugiere 3
            recetas que puedes cocinar hoy.
          </p>
          <button
            onClick={handleSuggestRecipes}
            disabled={loadingSuggest || !apiKey}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loadingSuggest ? (
              <><Loader2 size={16} className="animate-spin" /> Pensando...</>
            ) : (
              <><Sparkles size={16} /> Sugerirme recetas</>
            )}
          </button>
        </div>

        {/* Complete menu */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-accent-600" />
            <h2 className="font-semibold text-gray-700">Completar menú</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Claude rellena los slots vacíos del menú semanal eligiendo entre tus {recipes.length}{' '}
            recetas guardadas.
          </p>
          <button
            onClick={handleCompleteMenu}
            disabled={loadingComplete || !apiKey}
            className="btn-primary w-full bg-accent-600 hover:bg-accent-700 flex items-center justify-center gap-2"
          >
            {loadingComplete ? (
              <><Loader2 size={16} className="animate-spin" /> Planificando...</>
            ) : (
              <><Calendar size={16} /> Completar semana</>
            )}
          </button>
        </div>
      </div>

      {completedMenu && (
        <div className="mb-6 bg-accent-50 border border-accent-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-accent-700">
            Menú completado y aplicado al planificador
          </p>
        </div>
      )}

      {suggestedRecipes.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Recetas sugeridas</h2>
          <div className="space-y-3">
            {suggestedRecipes.map((recipe, i) => (
              <SuggestedRecipeCard
                key={i}
                recipe={recipe}
                onAdd={() => handleSaveRecipe(recipe)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
