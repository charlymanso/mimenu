import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
export const MEALS = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena']

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = MEALS.reduce((m, meal) => { m[meal] = null; return m }, {})
    return acc
  }, {})

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Weekly menu: { monday: { desayuno: text|null, almuerzo: text|null, ... }, ... }
      weeklyMenu: emptyWeek(),

      // Recipes stored locally (will sync with Supabase)
      recipes: [],

      // --- Weekly Menu actions ---
      setMealSlot: (day, meal, recipeId) =>
        set(state => ({
          weeklyMenu: {
            ...state.weeklyMenu,
            [day]: { ...state.weeklyMenu[day], [meal]: recipeId },
          },
        })),

      clearMealSlot: (day, meal) =>
        set(state => ({
          weeklyMenu: {
            ...state.weeklyMenu,
            [day]: { ...state.weeklyMenu[day], [meal]: null },
          },
        })),

      resetWeek: () => set({ weeklyMenu: emptyWeek() }),

      // --- Recipe actions ---
      addRecipe: recipe =>
        set(state => ({ recipes: [...state.recipes, { ...recipe, id: crypto.randomUUID() }] })),

      updateRecipe: (id, updates) =>
        set(state => ({
          recipes: state.recipes.map(r => (r.id === id ? { ...r, ...updates } : r)),
        })),

      deleteRecipe: id =>
        set(state => ({ recipes: state.recipes.filter(r => r.id !== id) })),

      getRecipeById: id => get().recipes.find(r => r.id === id) ?? null,

    }),
    {
      name: 'mimenu-storage',
      version: 3,
      migrate: (state, version) => {
        if (version < 2) {
          // eslint-disable-next-line no-unused-vars
          const { shoppingList: _, ...rest } = state
          return { ...rest, weeklyMenu: emptyWeek() }
        }
        if (version < 3) {
          // eslint-disable-next-line no-unused-vars
          const { pantryItems: _, ...rest } = state
          return rest
        }
        return state
      },
    }
  )
)

