import type { CategorySuggestion } from '../types';

// keyword (lowercase) → categoryId
const KEYWORD_MAP: Record<string, string> = {
  // Supermercados / alimentación
  mercadona: 'food', lidl: 'food', aldi: 'food', carrefour: 'food', dia: 'food',
  alcampo: 'food', eroski: 'food', consum: 'food', hipercor: 'food', spar: 'food',
  supercor: 'food', froiz: 'food', ahorramás: 'food', supermercado: 'food',
  alimentación: 'food', frutería: 'food', panadería: 'food', carnicería: 'food',
  pescadería: 'food', charcutería: 'food',

  // Restaurantes / ocio comida
  restaurante: 'restaurants', bar: 'restaurants', cafetería: 'restaurants',
  mcdonald: 'restaurants', burger: 'restaurants', kfc: 'restaurants',
  telepizza: 'restaurants', domino: 'restaurants', foster: 'restaurants',
  vips: 'restaurants', applebee: 'restaurants', subway: 'restaurants',
  glovo: 'restaurants', uber: 'restaurants', deliveroo: 'restaurants',
  justeat: 'restaurants', tapas: 'restaurants', pizzeria: 'restaurants',

  // Transporte / combustible
  repsol: 'gasolina', cepsa: 'gasolina', bp: 'gasolina', shell: 'gasolina',
  galp: 'gasolina', petronor: 'gasolina', gasolinera: 'gasolina', gasolina: 'gasolina',
  diesel: 'gasolina', combustible: 'gasolina',

  // Transporte público / movilidad
  renfe: 'transport', metro: 'transport', emt: 'transport', alsa: 'transport',
  avlo: 'transport', iryo: 'transport', ouigo: 'transport', blablacar: 'transport',
  taxi: 'transport', cabify: 'transport', bolt: 'transport', bus: 'transport',
  autobus: 'transport', tren: 'transport', transporte: 'transport', cercanías: 'transport',

  // Ocio / entretenimiento / streaming
  netflix: 'streaming', spotify: 'streaming', hbo: 'streaming', disney: 'streaming',
  amazon: 'streaming', twitch: 'streaming', youtube: 'streaming', apple: 'streaming',
  dazn: 'streaming', filmin: 'streaming', movistar: 'streaming',

  // Salud / farmacia
  farmacia: 'health', sanitas: 'health', adeslas: 'health', asisa: 'health',
  mapfre: 'health', clinica: 'health', médico: 'health', dentista: 'health',
  fisioterapia: 'health', hospital: 'health', seguro: 'health',
  parafarmacia: 'health', optica: 'health', óptica: 'health',

  // Ropa / moda
  zara: 'clothing', mango: 'clothing', hym: 'clothing', primark: 'clothing',
  bershka: 'clothing', stradivarius: 'clothing', pull: 'clothing', massimo: 'clothing',
  cortefiel: 'clothing', springfield: 'clothing', lefties: 'clothing',
  ropa: 'clothing', moda: 'clothing', calzado: 'clothing', zapatería: 'clothing',

  // Hogar / electrónica
  ikea: 'home', leroy: 'home', bricodepot: 'home', bricomart: 'home',
  leroymerlin: 'home', mediamarkt: 'electronics', fnac: 'electronics',
  pccomponentes: 'electronics', electrónica: 'electronics', informática: 'electronics',

  // Viajes / alojamiento
  booking: 'travel', airbnb: 'travel', iberia: 'travel',
  vueling: 'travel', ryanair: 'travel', easyjet: 'travel', hotel: 'travel',
  hostel: 'travel', vuelo: 'travel', avión: 'travel', viaje: 'travel',

  // Educación / suscripciones
  udemy: 'education', coursera: 'education', duolingo: 'education',
  escuela: 'education', academia: 'education', libro: 'education',
  universidad: 'education', formación: 'education', curso: 'education',

  // Gimnasio / deporte
  gimnasio: 'sport', gym: 'sport', decathlon: 'sport', intersport: 'sport',
  sport: 'sport', fitness: 'sport', crossfit: 'sport', pilates: 'sport',
  natación: 'sport', piscina: 'sport',

  // Banco / finanzas
  comisión: 'bank', banco: 'bank', hipoteca: 'bank', préstamo: 'bank',
  interés: 'bank', transferencia: 'bank', bizum: 'bank',

  // Suministros / utilities
  endesa: 'utilities', iberdrola: 'utilities', naturgy: 'utilities',
  electricidad: 'utilities', gas: 'utilities',
  agua: 'utilities', luz: 'utilities', comunidad: 'utilities',
  alquiler: 'housing', arrendamiento: 'housing',

  // Mascotas
  veterinario: 'pets', veterinaria: 'pets', mascota: 'pets', pienso: 'pets',
  perro: 'pets', gato: 'pets',
};

/**
 * Suggests a categoryId based on a transaction description.
 * Returns null if no keyword matches.
 */
export function suggestCategory(description: string): CategorySuggestion {
  if (!description || !description.trim()) return null;
  const lower = description.toLowerCase();
  for (const [keyword, categoryId] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return categoryId;
  }
  return null;
}
