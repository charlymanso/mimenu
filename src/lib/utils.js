export function getPrevWeekStart(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const prev = new Date(y, m - 1, d - 7)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
}

export function getNextWeekStart(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number)
  const next = new Date(y, m - 1, d + 7)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

export function getWeekStart() {
  const d = new Date()
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Strips combining diacritics (accents) and lowercases for accent-insensitive comparison
export function normalizeText(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

// Grouping key: strips accents + Spanish plural suffixes.
// Priority:
//   1. ends in "nes" (length > 4): strip "es"  → macarrones→macarron, limones→limon
//   2. ends in "s"   (length > 3): strip "s"   → platanos→platano, tomates→tomate
//   3. keep as-is                              → sal, pan, arroz
export function stemText(name) {
  const n = normalizeText(name)
  if (n.length > 4 && n.endsWith('nes')) return n.slice(0, -2)
  if (n.length > 3 && n.endsWith('s'))   return n.slice(0, -1)
  return n
}

// Returns the better display name: more accents wins; tie -> prefer shorter (singular)
export function betterName(a, b) {
  const da = accentCount(a)
  const db = accentCount(b)
  if (da !== db) return da > db ? a : b
  return a.length <= b.length ? a : b
}

// Counts accented characters - used to prefer the better-spelled variant
export function accentCount(name) {
  return (name.match(/[áéíóúüñÁÉÍÓÚÜÑ]/g) || []).length
}

export function guessCategory(name) {
  const n = normalizeText(name)
  if (/pollo|carne|ternera|cerdo|pavo|pescado|salmon|atun|merluza|gambas|marisco/.test(n))
    return 'Carnes y pescados'
  if (/leche|queso|yogur|nata|mantequilla|huevo/.test(n))
    return 'Lácteos y huevos'
  if (/manzana|naranja|platano|fresa|uva|pera|limon|tomate|lechuga|zanahoria|cebolla|ajo|patata|pimiento|calabacin|brocoli|espinaca/.test(n))
    return 'Frutas y verduras'
  if (/arroz|pasta|pan|harina|avena|lentejas|garbanzos|judias/.test(n))
    return 'Cereales y legumbres'
  if (/aceite|sal|pimienta|oregano|tomillo|canela|azucar|vinagre|salsa/.test(n))
    return 'Especias y condimentos'
  return 'Otros'
}
