export const SIZES = {
  xs:  10,
  sm:  12,
  md:  14,
  lg:  16,
  xl:  18,
  xxl: 22,
  xxxl: 28,
};

export const COLORS = {
  // Backgrounds
  bg: '#06060f',
  bgCard: '#0d0d1f',
  bgCardLight: '#13132b',
  bgModal: '#09091c',

  // Brand — purple neón
  primary: '#a855f7',
  primaryLight: '#c084fc',
  primaryDark: '#7c3aed',
  primaryGlow: 'rgba(168, 85, 247, 0.55)',

  // Cyan neón
  accent: '#22d3ee',
  accentLight: '#67e8f9',
  accentGlow: 'rgba(34, 211, 238, 0.55)',

  // Oro neón
  gold: '#fbbf24',
  goldLight: '#fde68a',
  goldGlow: 'rgba(251, 191, 36, 0.55)',

  // Semántico — verde y rojo neón
  income: '#34d399',
  incomeGlow: 'rgba(52, 211, 153, 0.45)',
  expense: '#fb7185',
  expenseGlow: 'rgba(251, 113, 133, 0.45)',

  // Texto
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#475569',
  textInverse: '#06060f',

  // Bordes
  border: 'rgba(168, 85, 247, 0.4)',
  borderAccent: 'rgba(34, 211, 238, 0.45)',
  borderGold: 'rgba(251, 191, 36, 0.45)',
  borderSubtle: 'rgba(255, 255, 255, 0.07)',

  // Overlays
  overlay: 'rgba(6, 6, 18, 0.88)',
  white: '#ffffff',
};

export const ACCOUNT_COLORS = [
  '#a855f7',
  '#22d3ee',
  '#fbbf24',
  '#34d399',
  '#fb7185',
  '#f472b6',
  '#818cf8',
  '#2dd4bf',
];

export const ACCOUNT_TYPES = [
  { id: 'checking',   label: 'Cuenta Corriente', icon: '🏦', image: 'tarjeta'     },
  { id: 'savings',    label: 'Ahorros',           icon: '💎', image: 'hucha-cerdo' },
  { id: 'cash',       label: 'Efectivo',           icon: '💵', image: 'dinero'      },
  { id: 'investment', label: 'Inversión',          icon: '📈', image: 'inversion'   },
  { id: 'other',      label: 'Otro',               icon: '💳', image: 'cartera'     },
];

// ─── Categorías por defecto ─────────────────────────────────────────────────
// IDs legacy mantenidos para que las transacciones existentes resuelvan bien.
// Cada entry: { id, name, image (clave de emote), icon (emoji fallback), group }
export const DEFAULT_CATEGORIES = {
  income: [
    // ── Trabajo ──────────────────────────────────────────────────
    { id: 'salary',        name: 'Nómina',           icon: '👑', group: 'Trabajo' },
    { id: 'freelance',     name: 'Freelance',         icon: '💻', group: 'Trabajo' },
    { id: 'autonomo_inc',  name: 'Autónomo',          icon: '⚙️', group: 'Trabajo' },
    { id: 'trabajo_inc',   name: 'Trabajo extra',     icon: '💰', group: 'Trabajo' },
    { id: 'bonus',         name: 'Bonus / Prima',     icon: '🏆', group: 'Trabajo' },
    { id: 'dietas',        name: 'Dietas / Gastos',   icon: '🧾', group: 'Trabajo' },
    // ── Transferencias recibidas ──────────────────────────────
    { id: 'bizum_in',      name: 'Bizum recibido',    icon: '📲', group: 'Transferencias' },
    { id: 'transfer_in2',  name: 'Transferencia rec.',icon: '🏦', group: 'Transferencias' },
    { id: 'reembolso',     name: 'Reembolso',         icon: '↩️', group: 'Transferencias' },
    { id: 'devolucion',    name: 'Devolución',        icon: '🔄', group: 'Transferencias' },
    // ── Prestaciones / Ayudas ────────────────────────────────
    { id: 'pension',       name: 'Pensión',           icon: '👴', group: 'Prestaciones' },
    { id: 'paro',          name: 'Prestación por desempleo', icon: '📋', group: 'Prestaciones' },
    { id: 'beca',          name: 'Beca',              icon: '🎓', group: 'Prestaciones' },
    { id: 'ayuda_gov',     name: 'Ayuda / Subvención',icon: '🏛️', group: 'Prestaciones' },
    // ── Pasivos / Patrimonio ─────────────────────────────────
    { id: 'investments',   name: 'Inversiones',       icon: '📈', group: 'Patrimonio' },
    { id: 'dividends',     name: 'Dividendos',        icon: '💹', group: 'Patrimonio' },
    { id: 'rental',        name: 'Alquiler cobrado',  icon: '🏠', group: 'Patrimonio' },
    { id: 'venta',         name: 'Venta de artículo', icon: '🏷️', group: 'Patrimonio' },
    { id: 'crypto_in',     name: 'Criptomonedas',     icon: '🪙', group: 'Patrimonio' },
    // ── Otros ────────────────────────────────────────────────
    { id: 'gifts',         name: 'Regalo recibido',   icon: '🎁', group: 'Otros' },
    { id: 'premio',        name: 'Premio / Lotería',  icon: '🎰', group: 'Otros' },
    { id: 'cashback',      name: 'Cashback',          icon: '💳', group: 'Otros' },
    { id: 'other_income',  name: 'Otros ingresos',    icon: '➕', group: 'Otros' },
  ],
  expense: [
    // ── Alimentación ──────────────────────────────────────────────
    { id: 'food',               name: 'Supermercado',   image: 'supermercado',      icon: '🛒', group: 'Alimentación' },
    { id: 'restaurants',        name: 'Restaurantes',   image: 'tenedor-cuchillo',  icon: '🍽️', group: 'Alimentación' },
    { id: 'comida-para-llevar', name: 'Para llevar',    image: 'comida-para-llevar',icon: '🍔', group: 'Alimentación' },
    { id: 'desayunos',          name: 'Desayunos/Café', image: 'cafe',              icon: '☕', group: 'Alimentación' },
    { id: 'caprichos-dulces',   name: 'Dulces',         image: 'chocolate',         icon: '🍫', group: 'Alimentación' },
    { id: 'cervezas',           name: 'Cervezas',       image: 'cerveza',           icon: '🍺', group: 'Alimentación' },
    { id: 'copas',              name: 'Copas/Bar',      image: 'copa',              icon: '🥃', group: 'Alimentación' },
    // ── Transporte ────────────────────────────────────────────────
    { id: 'transport',          name: 'T. Público',     image: 'autobus',           icon: '🚌', group: 'Transporte' },
    { id: 'gasolina',           name: 'Gasolina',       image: 'gasolinera',        icon: '⛽', group: 'Transporte' },
    { id: 'taxi',               name: 'Taxi / VTC',     image: 'taxi',              icon: '🚕', group: 'Transporte' },
    { id: 'moto',               name: 'Moto',           image: 'casco-moto',        icon: '🛵', group: 'Transporte' },
    { id: 'coche',              name: 'Coche',          image: 'coche',             icon: '🚗', group: 'Transporte' },
    { id: 'coche-electrico',    name: 'Vehículo elec.', image: 'coche',             icon: '⚡', group: 'Transporte' },
    { id: 'parking',            name: 'Parking',        image: 'parking',           icon: '🅿️', group: 'Transporte' },
    { id: 'seguro-vehiculo',    name: 'Seguro vehículo',image: 'escudo',            icon: '🛡️', group: 'Transporte' },
    { id: 'taller',             name: 'Taller',         image: 'caja-herramientas', icon: '🔧', group: 'Transporte' },
    { id: 'multas',             name: 'Multas',         image: 'señal',             icon: '🚫', group: 'Transporte' },
    // ── Hogar ─────────────────────────────────────────────────────
    { id: 'housing',            name: 'Alquiler/Hipoteca', image: 'casa',           icon: '🏠', group: 'Hogar' },
    { id: 'electricidad',       name: 'Electricidad',   image: 'rayo',              icon: '⚡', group: 'Hogar' },
    { id: 'gas',                name: 'Gas',            image: 'fuego',             icon: '🔥', group: 'Hogar' },
    { id: 'agua',               name: 'Agua',           image: 'gota',              icon: '💧', group: 'Hogar' },
    { id: 'internet',           name: 'Internet',       image: 'nube-tormenta',     icon: '📶', group: 'Hogar' },
    { id: 'movil',              name: 'Móvil',          image: 'movil',             icon: '📱', group: 'Hogar' },
    { id: 'limpieza-hogar',     name: 'Limpieza hogar', image: 'escoba',            icon: '🧹', group: 'Hogar' },
    { id: 'reparaciones-casa',  name: 'Reparaciones',   image: 'martillo',          icon: '🔨', group: 'Hogar' },
    { id: 'decoracion',         name: 'Decoración',     image: 'planta',            icon: '🌿', group: 'Hogar' },
    { id: 'muebles',            name: 'Muebles',        image: 'sofa',              icon: '🛋️', group: 'Hogar' },
    { id: 'bricolaje',          name: 'Bricolaje',      image: 'sierra',            icon: '🪚', group: 'Hogar' },
    // ── Salud ─────────────────────────────────────────────────────
    { id: 'health',             name: 'Médico',         image: 'medico-2',          icon: '🏥', group: 'Salud' },
    { id: 'medicinas',          name: 'Medicinas',      image: 'pastillas',         icon: '💊', group: 'Salud' },
    { id: 'dentista',           name: 'Dentista',       image: 'diente',            icon: '🦷', group: 'Salud' },
    { id: 'psicologo',          name: 'Psicólogo',      image: 'cerebro',           icon: '🧠', group: 'Salud' },
    { id: 'gafas-lentillas',    name: 'Gafas / Lentillas', image: 'gafas',          icon: '👓', group: 'Salud' },
    { id: 'tratamientos-medicos', name: 'Tratamientos', image: 'jeringuilla',       icon: '💉', group: 'Salud' },
    // ── Ocio ──────────────────────────────────────────────────────
    { id: 'entertainment',      name: 'Cine',           image: 'claqueta',          icon: '🎬', group: 'Ocio' },
    { id: 'teatro',             name: 'Teatro/Espect.', image: 'mascaras',          icon: '🎭', group: 'Ocio' },
    { id: 'musica',             name: 'Música',         image: 'nota-musical',      icon: '🎵', group: 'Ocio' },
    { id: 'instrumentos',       name: 'Instrumentos',   image: 'guitarra',          icon: '🎸', group: 'Ocio' },
    { id: 'videojuegos',        name: 'Videojuegos',    image: 'videojuegos',       icon: '🎮', group: 'Ocio' },
    { id: 'consolas',           name: 'Consolas/HW',    image: 'mando-consola',     icon: '🕹️', group: 'Ocio' },
    { id: 'juegos-mesa',        name: 'Juegos de mesa', image: 'dado',              icon: '🎲', group: 'Ocio' },
    { id: 'arte',               name: 'Arte',           image: 'pintura',           icon: '🎨', group: 'Ocio' },
    { id: 'manualidades',       name: 'Manualidades',   image: 'aguja-hilo',        icon: '✂️', group: 'Ocio' },
    { id: 'fotografia',         name: 'Fotografía',     image: 'camara-fotos',      icon: '📷', group: 'Ocio' },
    // ── Tecnología ────────────────────────────────────────────────
    { id: 'software',           name: 'Software/Apps',  image: 'robot',             icon: '🤖', group: 'Tecnología' },
    { id: 'cloud',              name: 'Cloud/Hosting',  image: 'nube-tormenta',     icon: '☁️', group: 'Tecnología' },
    { id: 'pc-hardware',        name: 'Hardware PC',    image: 'monitor',           icon: '🖥️', group: 'Tecnología' },
    { id: 'perifericos',        name: 'Periféricos',    image: 'teclado',           icon: '⌨️', group: 'Tecnología' },
    { id: 'ia',                 name: 'IA / GPT',       image: 'hacker',            icon: '🤖', group: 'Tecnología' },
    // ── Ropa y Belleza ────────────────────────────────────────────
    { id: 'clothing',           name: 'Ropa',           image: 'camiseta',          icon: '👕', group: 'Ropa y Belleza' },
    { id: 'cosmetica',          name: 'Cosmética',      image: 'cosmetico',         icon: '💄', group: 'Ropa y Belleza' },
    { id: 'peluqueria',         name: 'Peluquería',     image: 'peluqueria',        icon: '✂️', group: 'Ropa y Belleza' },
    { id: 'cuidado-personal',   name: 'Cuidado personal', image: 'flor-loto',       icon: '🧴', group: 'Ropa y Belleza' },
    { id: 'joyas',              name: 'Joyas',          image: 'diamante',          icon: '💎', group: 'Ropa y Belleza' },
    { id: 'accesorios',         name: 'Accesorios',     image: 'bolso',             icon: '👜', group: 'Ropa y Belleza' },
    // ── Formación ─────────────────────────────────────────────────
    { id: 'education',          name: 'Estudios',       image: 'gorro-graduacion',  icon: '🎓', group: 'Formación' },
    { id: 'cursos',             name: 'Cursos',         image: 'libro-abierto',     icon: '📖', group: 'Formación' },
    { id: 'libros',             name: 'Libros',         image: 'libro',             icon: '📚', group: 'Formación' },
    { id: 'certificaciones',    name: 'Certificaciones',image: 'troefeo',           icon: '🏆', group: 'Formación' },
    { id: 'manga-novelas',      name: 'Manga/Novelas',  image: 'libros-2',          icon: '📕', group: 'Formación' },
    { id: 'papeleria',          name: 'Papelería',      image: 'lapiz',             icon: '✏️', group: 'Formación' },
    // ── Suscripciones ─────────────────────────────────────────────
    { id: 'subscriptions',      name: 'Suscripciones',  image: 'repeticion',        icon: '🔄', group: 'Suscripciones' },
    { id: 'streaming',          name: 'Streaming',      image: 'television',        icon: '📺', group: 'Suscripciones' },
    // ── Mascotas ──────────────────────────────────────────────────
    { id: 'mascotas-perro',     name: 'Perro',          image: 'perro',             icon: '🐕', group: 'Mascotas' },
    { id: 'mascotas-gato',      name: 'Gato',           image: 'gato',              icon: '🐈', group: 'Mascotas' },
    { id: 'comida-mascotas',    name: 'Comida mascotas',image: 'comida-mascotas',   icon: '🦴', group: 'Mascotas' },
    { id: 'veterinario',        name: 'Veterinario',    image: 'salud',             icon: '🏥', group: 'Mascotas' },
    // ── Social ────────────────────────────────────────────────────
    { id: 'familia',            name: 'Familia',        image: 'familia',           icon: '👨‍👩‍👧', group: 'Social' },
    { id: 'pareja',             name: 'Pareja',         image: 'corazon',           icon: '💑', group: 'Social' },
    { id: 'regalos',            name: 'Regalos',        image: 'caja-regalo',       icon: '🎁', group: 'Social' },
    { id: 'cumpleanos',         name: 'Cumpleaños',     image: 'fiesta',            icon: '🎂', group: 'Social' },
    { id: 'bodas',              name: 'Bodas',          image: 'iglesia',           icon: '💍', group: 'Social' },
    { id: 'eventos',            name: 'Eventos',        image: 'fiesta',            icon: '🎉', group: 'Social' },
    { id: 'donaciones',         name: 'Donaciones',     image: 'corazon-manos',     icon: '🤝', group: 'Social' },
    // ── Finanzas ──────────────────────────────────────────────────
    { id: 'impuestos',          name: 'Impuestos',      image: 'balanza',           icon: '⚖️', group: 'Finanzas' },
    { id: 'gestoria-abogado',   name: 'Gestoría',       image: 'balanza',           icon: '📋', group: 'Finanzas' },
    { id: 'seguros',            name: 'Seguros',        image: 'escudo',            icon: '🛡️', group: 'Finanzas' },
    { id: 'banco',              name: 'Comisiones',     image: 'banco',             icon: '🏦', group: 'Finanzas' },
    { id: 'tarjeta',            name: 'Tarjeta crédito',image: 'tarjeta',           icon: '💳', group: 'Finanzas' },
    { id: 'apuestas',           name: 'Apuestas',       image: 'maquina-apuestas',  icon: '🎰', group: 'Finanzas' },
    { id: 'emergencia',         name: 'Emergencia',     image: 'luz-emergencia',    icon: '🚨', group: 'Finanzas' },
    { id: 'facturas-generales', name: 'Facturas',       image: 'papel',             icon: '📄', group: 'Finanzas' },
    // ── Deporte ───────────────────────────────────────────────────
    { id: 'sports',             name: 'Gimnasio',       image: 'pesa',              icon: '🏋️', group: 'Deporte' },
    { id: 'material-deportivo', name: 'Material deporte', image: 'diana',           icon: '⚽', group: 'Deporte' },
    { id: 'yoga',               name: 'Yoga/Bienestar', image: 'yoga',              icon: '🧘', group: 'Deporte' },
    // ── Compras ───────────────────────────────────────────────────
    { id: 'compras-online',     name: 'Compras online', image: 'carrito-compra',    icon: '🛍️', group: 'Compras' },
    { id: 'compras-fisicas',    name: 'Compras físicas',image: 'tienda',            icon: '🏪', group: 'Compras' },
    { id: 'merchandising',      name: 'Merchandising',  image: 'camiseta',          icon: '👕', group: 'Compras' },
    { id: 'frikadas',           name: 'Frikadas',       image: 'cubo-rubik',        icon: '🤓', group: 'Compras' },
    // ── Viajes ────────────────────────────────────────────────────
    { id: 'travel',             name: 'Viajes',         image: 'maleta',            icon: '✈️', group: 'Viajes' },
    { id: 'vacaciones',         name: 'Vacaciones',     image: 'playa',             icon: '🏖️', group: 'Viajes' },
    // ── Trabajo (gastos) ──────────────────────────────────────────
    { id: 'trabajo_exp',        name: 'Gastos trabajo', image: 'maletin',           icon: '💼', group: 'Trabajo' },
    { id: 'autonomo_exp',       name: 'Gastos autónomo',image: 'engranage',         icon: '⚙️', group: 'Trabajo' },
    // ── Otros ─────────────────────────────────────────────────────
    { id: 'lavanderia',         name: 'Lavandería',     image: 'lavadora',          icon: '🫧', group: 'Otros' },
    { id: 'productos-basicos',  name: 'Básicos/Higiene',image: 'bolsa-compra',      icon: '🛒', group: 'Otros' },
    { id: 'other_expense',      name: 'Otros gastos',   image: 'signo-interrogacion', icon: '❓', group: 'Otros' },
    { id: 'sin-clasificar',     name: 'Sin clasificar', image: 'signo-interrogacion', icon: '❓', group: 'Otros' },
    { id: 'dinero-desaparecido',name: 'Dinero misterioso', image: 'tumba',          icon: '🤷', group: 'Otros' },
  ],
};

export const FREQUENCY_OPTIONS = [
  { id: 'daily',     label: 'Diario' },
  { id: 'weekly',    label: 'Semanal' },
  { id: 'monthly',   label: 'Mensual' },
  { id: 'quarterly', label: 'Trimestral' },
  { id: 'yearly',    label: 'Anual' },
  { id: 'custom',    label: 'Cada X meses' },
];

// Emoji picker — para deudas y metas (se muestra como texto, no imagen)
export const EMOJI_OPTIONS = [
  '👑','⚡','💎','🏰','🍖','🧪','🔮','🛡️','📜','🌀','🗺️','⚔️','🐉','🗡️',
  '🏹','🪄','💀','🔱','⚗️','🧿','🕯️','🔯','💫','🌟','✨','🪙','🗝️','📿',
  '💰','💳','💵','💸','🏦','📈','📉','🤑',
  '🛒','🍕','🍔','🍽️','☕','🍷','🍺','🍜','🥗','🍱','🧃','🍰',
  '🚗','🚌','✈️','🚇','🛵','🚲','⛽','🛳️',
  '🏠','🏡','💡','🔧','🛋️','📦','🔑','🧹',
  '💊','🏥','🏃','🧘','💪','🏋️','⚽','🎾','🚴',
  '🎮','🎬','🎵','🎭','🎨','🎲','📺','🎤',
  '👗','👟','💄','✂️','🎁','🛍️','💍','🕶️','⌚',
  '💻','📱','🖥️','📷','💼','📊','🎧','🔋',
  '📚','🎓','✏️','📝','🔬','📐','🗒️','🧮',
  '🐕','🐈','🌿','🌺','🌳','🌊','🏖️','🏔️','🏕️',
  '🏚️','🚧','⚠️','🎯','🧩','🔐','🪤','🎪',
];
