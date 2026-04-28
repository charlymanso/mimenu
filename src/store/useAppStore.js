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

      // Pantry items
      pantryItems: [],

      // Shopping list
      shoppingList: [],

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

      // --- Pantry actions ---
      addPantryItem: item =>
        set(state => ({
          pantryItems: [...state.pantryItems, { ...item, id: crypto.randomUUID() }],
        })),

      updatePantryItem: (id, updates) =>
        set(state => ({
          pantryItems: state.pantryItems.map(i => (i.id === id ? { ...i, ...updates } : i)),
        })),

      deletePantryItem: id =>
        set(state => ({ pantryItems: state.pantryItems.filter(i => i.id !== id) })),

      // --- Shopping list actions ---
      setShoppingList: list => set({ shoppingList: list }),

      addShoppingItem: item =>
        set(state => ({
          shoppingList: [
            ...state.shoppingList,
            { ...item, id: crypto.randomUUID(), checked: false },
          ],
        })),

      toggleShoppingItem: id =>
        set(state => ({
          shoppingList: state.shoppingList.map(i =>
            i.id === id ? { ...i, checked: !i.checked } : i
          ),
        })),

      removeShoppingItem: id =>
        set(state => ({ shoppingList: state.shoppingList.filter(i => i.id !== id) })),

      clearCheckedItems: () =>
        set(state => ({ shoppingList: state.shoppingList.filter(i => !i.checked) })),
    }),
    {
      name: 'mimenu-storage',
      version: 1,
      migrate: (state, version) => {
        if (version === 0) return { ...state, weeklyMenu: emptyWeek() }
        return state
      },
    }
  )
)

