// Las llamadas a Anthropic van a través de /api/claude (Vercel serverless).
// La API key vive solo en el servidor — nunca llega al bundle del browser.

export { correctSpelling } from './spellcheck'

async function callClaude(body) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Claude API error: ${response.statusText}`)
  return response.json()
}

export async function suggestRecipesFromPantry(pantryItems) {
  const ingredientList = pantryItems
    .map(i => `- ${i.name}: ${i.quantity} ${i.unit}`)
    .join('\n')

  const data = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Eres un chef experto. Basándote en estos ingredientes de despensa, sugiere exactamente 3 recetas que se puedan hacer con ellos. Para cada receta incluye: nombre, ingredientes necesarios (con cantidades), pasos resumidos (máximo 5) y tiempo de preparación.

Ingredientes disponibles:
${ingredientList}

Responde en formato JSON con esta estructura:
{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "ingredients": [{"name": "...", "quantity": "...", "unit": "..."}],
      "steps": ["paso 1", "paso 2", ...],
      "prep_time": 30
    }
  ]
}`,
      },
    ],
  })

  try {
    const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Could not parse Claude response as JSON')
  }
}

export async function completeWeeklyMenu(existingMenu, pantryItems, recipes) {
  const recipeNames = recipes.map(r => r.name).join(', ')
  const menuSummary = Object.entries(existingMenu)
    .map(([day, meals]) =>
      `${day}: comida=${meals.lunch?.name ?? 'vacío'}, cena=${meals.dinner?.name ?? 'vacío'}`
    )
    .join('\n')

  const data = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Eres un nutricionista y chef. Completa el menú semanal vacío o incompleto con recetas variadas y equilibradas.

Recetas disponibles: ${recipeNames}

Menú actual:
${menuSummary}

Rellena los slots vacíos eligiendo de las recetas disponibles. Responde en JSON:
{
  "menu": {
    "monday": {"lunch": "nombre_receta", "dinner": "nombre_receta"},
    "tuesday": {"lunch": "...", "dinner": "..."},
    "wednesday": {"lunch": "...", "dinner": "..."},
    "thursday": {"lunch": "...", "dinner": "..."},
    "friday": {"lunch": "...", "dinner": "..."},
    "saturday": {"lunch": "...", "dinner": "..."},
    "sunday": {"lunch": "...", "dinner": "..."}
  }
}
Solo incluye los slots que estaban vacíos.`,
      },
    ],
  })

  try {
    const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Could not parse Claude response as JSON')
  }
}
