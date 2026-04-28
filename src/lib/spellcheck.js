import nspell from 'nspell'

// Correcciones hardcodeadas para nombres de alimentos en español.
// Cubre errores tipográficos frecuentes y palabras sin tilde.
const CORRECTIONS = {
  // Verduras y hortalizas
  aroz: 'arroz', arróz: 'arroz',
  cevolla: 'cebolla', sebolla: 'cebolla',
  sanaoria: 'zanahoria', zanaoria: 'zanahoria', sanaória: 'zanahoria',
  pimenton: 'pimentón', pimienton: 'pimentón',
  lechua: 'lechuga', letuga: 'lechuga',
  espinaca: 'espinaca',
  brocoli: 'brócoli', brocolli: 'brócoli', brocolis: 'brócolis',
  calabacin: 'calabacín', calabacines: 'calabacines',
  champiñon: 'champiñón', champinon: 'champiñón', champignon: 'champiñón',
  champinones: 'champiñones', champignones: 'champiñones',
  coliflol: 'coliflor',
  esparragos: 'espárragos', esparragus: 'espárragos',
  aguacate: 'aguacate',
  berengena: 'berenjena', berenjena: 'berenjena',
  pepino: 'pepino',
  puerro: 'puerro', puero: 'puerro',
  apio: 'apio',
  nabo: 'nabo',
  rucula: 'rúcula', rucola: 'rúcula',

  // Frutas
  platano: 'plátano', platanos: 'plátanos',
  limon: 'limón', limones: 'limones',
  melon: 'melón', melones: 'melones',
  sandia: 'sandía', sandias: 'sandías',
  pina: 'piña', pinas: 'piñas',
  melocoton: 'melocotón', melocotones: 'melocotones',
  albaricoque: 'albaricoque',
  arandanos: 'arándanos', arandano: 'arándano',
  platano: 'plátano',
  kiwi: 'kiwi',
  ceresas: 'cerezas', sereza: 'cereza', serezas: 'cerezas',
  ciruelas: 'ciruelas', ciruela: 'ciruela',
  frambuesa: 'frambuesa',
  mandarina: 'mandarina', mandarinas: 'mandarinas',
  pomelo: 'pomelo',
  uvas: 'uvas', uva: 'uva',

  // Carnes y aves
  pllo: 'pollo', plllo: 'pollo',
  ternera: 'ternera',
  corde: 'cordero', cordero: 'cordero',
  cerdo: 'cerdo', serdo: 'cerdo',
  jamon: 'jamón', jamones: 'jamones',
  salchica: 'salchicha', salchicas: 'salchichas',
  choriso: 'chorizo', chorizos: 'chorizos',
  pavo: 'pavo',
  conejo: 'conejo',
  pechuga: 'pechuga', pechugas: 'pechugas',
  muslos: 'muslos',
  costias: 'costillas', costillas: 'costillas',
  chuleta: 'chuleta', chuletas: 'chuletas',
  lomo: 'lomo',
  filete: 'filete', filetes: 'filetes',
  hamburguesa: 'hamburguesa', hambuguesa: 'hamburguesa',
  albondigas: 'albóndigas', albondiga: 'albóndiga',
  morcila: 'morcilla',

  // Pescados y mariscos
  salmon: 'salmón',
  atun: 'atún',
  bacalao: 'bacalao', bacallao: 'bacalao',
  sardinas: 'sardinas', sardina: 'sardina',
  boquerones: 'boquerones', boqueron: 'boquerón',
  anchoas: 'anchoas', anchoa: 'anchoa',
  merluza: 'merluza', merlusa: 'merluza',
  gambas: 'gambas', gamba: 'gamba',
  mejillones: 'mejillones', mejillon: 'mejillón',
  almejas: 'almejas', almeja: 'almeja',
  calamar: 'calamar', calamares: 'calamares',
  pulpo: 'pulpo',
  langostinos: 'langostinos', langostino: 'langostino',
  lubina: 'lubina',
  dorada: 'dorada',
  rape: 'rape',

  // Lácteos y huevos
  leche: 'leche',
  queso: 'queso', quesos: 'quesos',
  huevo: 'huevo', uevo: 'huevo', huevos: 'huevos', uevos: 'huevos',
  yogur: 'yogur', yogurt: 'yogur', iogur: 'yogur',
  mantequila: 'mantequilla', manteq: 'mantequilla', mantecilla: 'mantequilla',
  nata: 'nata',
  requesón: 'requesón', reqeuson: 'requesón', requeson: 'requesón',
  mozzarella: 'mozzarella', mozarela: 'mozzarella', mozarella: 'mozzarella',

  // Legumbres y cereales
  lentejas: 'lentejas', lenteja: 'lenteja',
  garbanzos: 'garbanzos', garbanzo: 'garbanzo', garvanzo: 'garbanzo',
  alubias: 'alubias', alubia: 'alubia',
  judias: 'judías', judia: 'judía',
  guisantes: 'guisantes', guisante: 'guisante',
  habas: 'habas', haba: 'haba',
  soja: 'soja',
  maiz: 'maíz',
  trigo: 'trigo',
  avena: 'avena',
  quinoa: 'quinoa', quinua: 'quinoa',
  cuscus: 'cuscús', cous: 'cuscús',

  // Pasta, arroz y harinas
  macarones: 'macarrones', macarrone: 'macarrón',
  espagueti: 'espagueti', spaghetti: 'espagueti', espaguetis: 'espaguetis',
  fideos: 'fideos', fideo: 'fideo',
  ñoquis: 'ñoquis', noquis: 'ñoquis',
  lasaña: 'lasaña', lasagna: 'lasaña', lasana: 'lasaña',
  arina: 'harina', harina: 'harina',
  pan: 'pan',
  tostadas: 'tostadas', tostada: 'tostada',
  galleta: 'galleta', galeta: 'galleta',

  // Condimentos y aceites
  sal: 'sal',
  pimienta: 'pimienta',
  oregano: 'orégano', oreano: 'orégano',
  tomillo: 'tomillo',
  romero: 'romero',
  laurel: 'laurel',
  canela: 'canela',
  comino: 'comino',
  azafran: 'azafrán',
  curry: 'curry',
  jenjibre: 'jengibre', gengible: 'jengibre', ginjibre: 'jengibre',
  nuez: 'nuez',
  paprika: 'páprika', paprica: 'páprika',
  aceite: 'aceite', acsaite: 'aceite', asaite: 'aceite',
  vinagre: 'vinagre',
  ajo: 'ajo',
  perejil: 'perejil', perejíl: 'perejil',
  albahaca: 'albahaca', albajaca: 'albahaca',
  cebolin: 'cebollín', cebollin: 'cebollín',

  // Azúcar y dulces
  azucar: 'azúcar', asucar: 'azúcar', asúcar: 'azúcar',
  miel: 'miel',
  mermelada: 'mermelada', merlmelada: 'mermelada',
  chocolate: 'chocolate', chocholate: 'chocolate',
  cacao: 'cacao',
  vainilla: 'vainilla', vainila: 'vainilla',
  levadura: 'levadura',

  // Salsas y condimentos
  mayonesa: 'mayonesa', mahonesa: 'mayonesa', maionesa: 'mayonesa',
  ketchup: 'ketchup', ketchu: 'ketchup',
  mostaza: 'mostaza',
  tomate: 'tomate', tommate: 'tomate',

  // Bebidas
  zumo: 'zumo',
  cafe: 'café', kafe: 'café',
  te: 'té',
  agua: 'agua',

  // Otros
  tofu: 'tofu',
  seitan: 'seitán', séitan: 'seitán',
  tempeh: 'tempeh',
}

// Normaliza una palabra para buscarla en el mapa de correcciones
function normalize(word) {
  return word.toLowerCase().normalize('NFC')
}

let checker = null
let checkerReady = false

// Carga el diccionario desde /public una sola vez
const ready = (async () => {
  try {
    const [affRes, dicRes] = await Promise.all([
      fetch('/dictionaries/es/index.aff'),
      fetch('/dictionaries/es/index.dic'),
    ])
    if (!affRes.ok || !dicRes.ok) throw new Error('not found')
    const [aff, dic] = await Promise.all([affRes.text(), dicRes.text()])
    checker = nspell(aff, dic)
    checkerReady = true
  } catch {
    // Fallback silencioso: solo se usará el mapa hardcodeado
  }
})()

function preserveCase(original, corrected) {
  if (!original || !corrected) return corrected
  if (original[0] === original[0].toUpperCase()) {
    return corrected[0].toUpperCase() + corrected.slice(1)
  }
  return corrected
}

// Corrige una sola palabra usando el mapa hardcodeado y luego nspell
function correctWord(word) {
  if (!word || word.length <= 2) return word

  // 1. Mapa hardcodeado
  const key = normalize(word)
  if (CORRECTIONS[key] && CORRECTIONS[key] !== key) {
    return preserveCase(word, CORRECTIONS[key])
  }

  // 2. nspell (si está disponible y la palabra es incorrecta)
  if (checkerReady && !checker.correct(word)) {
    const suggestions = checker.suggest(word)
    if (suggestions.length > 0) return suggestions[0]
  }

  return word
}

// Separa el texto en tokens (palabras + espacios/puntuación) y corrige cada palabra
export async function correctSpelling(text) {
  await ready

  // Tokeniza respetando espacios y signos de puntuación
  const tokens = text.split(/(\s+|[,;.:!?]+)/)
  return tokens
    .map(token => {
      if (!token || /^[\s,;.:!?]+$/.test(token)) return token
      return correctWord(token)
    })
    .join('')
}
