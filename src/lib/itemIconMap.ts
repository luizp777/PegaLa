import type { CategoryId } from '../types';
import { hasWholePhrase, normalizeText } from './categories';

/**
 * Chaves dos ícones vetoriais minimalistas (Lucide + SVGs line-art duotone sob medida).
 * Zero emojis — 100% vetorial minimalista.
 */
export type VectorIconKey =
  | 'aerosol_spray'
  | 'apple'
  | 'avocado'
  | 'baby'
  | 'baby_bottle'
  | 'bacon'
  | 'baking_powder'
  | 'banana'
  | 'bandage'
  | 'bandage_roll'
  | 'bath'
  | 'battery'
  | 'bean'
  | 'beef'
  | 'beer'
  | 'beet'
  | 'bell_pepper'
  | 'bone'
  | 'bread_loaf'
  | 'broccoli'
  | 'broom'
  | 'brush'
  | 'burger'
  | 'butter_dish'
  | 'cake'
  | 'cake_slice'
  | 'candy'
  | 'carrot'
  | 'cassava'
  | 'cat'
  | 'cat_litter'
  | 'chayote'
  | 'cheese_bread'
  | 'cheese_wedge'
  | 'cherry'
  | 'citrus'
  | 'coconut'
  | 'coffee'
  | 'coffee_capsule'
  | 'condom_pack'
  | 'cookie'
  | 'corn'
  | 'cotton_swab'
  | 'croissant'
  | 'cucumber'
  | 'deodorant'
  | 'detergent_bottle'
  | 'diaper'
  | 'dog'
  | 'donut'
  | 'droplet'
  | 'droplets'
  | 'drumstick'
  | 'egg'
  | 'eggplant'
  | 'eye'
  | 'eye_drops'
  | 'fish'
  | 'flame'
  | 'flower'
  | 'foil_roll'
  | 'garlic'
  | 'ginger'
  | 'glue_tube'
  | 'grape'
  | 'ham'
  | 'hand'
  | 'hanger'
  | 'hot_water_bag'
  | 'ice_cream_bowl'
  | 'ice_cream_cone'
  | 'jam_jar'
  | 'juice_box'
  | 'ketchup_bottle'
  | 'kiwi'
  | 'laundry_box'
  | 'leaf'
  | 'leafy_green'
  | 'lightbulb'
  | 'lollipop'
  | 'mango'
  | 'martini'
  | 'milk'
  | 'milk_carton'
  | 'milk_off'
  | 'mouthwash'
  | 'mushroom'
  | 'nail_polish'
  | 'nasal_spray'
  | 'nut'
  | 'olive_oil_bottle'
  | 'onion'
  | 'pacifier'
  | 'package'
  | 'papaya'
  | 'passion_fruit'
  | 'pasta_bowl'
  | 'pastry_roll'
  | 'paw'
  | 'pear'
  | 'perfume_bottle'
  | 'pet_food_bag'
  | 'pill'
  | 'pill_blister'
  | 'pill_bottle'
  | 'pineapple'
  | 'pizza'
  | 'popcorn'
  | 'popsicle'
  | 'potato'
  | 'probiotic_ampoule'
  | 'rapid_test'
  | 'razor'
  | 'rice_bag'
  | 'salad'
  | 'salt_shaker'
  | 'sandwich'
  | 'sanitary_pad'
  | 'sausage'
  | 'scissors'
  | 'serum_dropper'
  | 'shampoo_bottle'
  | 'shield_plus'
  | 'snowflake'
  | 'soap_bar'
  | 'soda'
  | 'soda_can'
  | 'soup'
  | 'sparkles'
  | 'sponge'
  | 'spray'
  | 'stethoscope'
  | 'sun'
  | 'sunscreen_tube'
  | 'supplement_tub'
  | 'surgical_mask'
  | 'syringe'
  | 'syrup_bottle'
  | 'tape_roll'
  | 'tapioca'
  | 'tea_bag'
  | 'thermometer'
  | 'toilet'
  | 'toilet_paper'
  | 'tomato'
  | 'toothbrush'
  | 'toothpaste'
  | 'toothpick_box'
  | 'trash'
  | 'tweezers'
  | 'utensils'
  | 'vegan'
  | 'water'
  | 'watermelon'
  | 'wheat'
  | 'whipped_cream'
  | 'wine'
  | 'yogurt_cup';

/**
 * Representação visual minimalista resolvida para um item:
 * - `'svg'`: ícone vetorial minimalista line-art;
 * - `'monogram'`: monograma minimalista com as iniciais do item para itens personalizados desconhecidos.
 */
export type ResolvedItemIcon =
  | { kind: 'svg'; key: VectorIconKey }
  | { kind: 'monogram' };

/**
 * Paleta de cores Tailwind minimalista (fundo translúcido + cor de traço) para cada corredor ou produto.
 */
export interface CategoryIconTheme {
  /** Classes de fundo e borda suave para o badge do ícone. */
  badgeClass: string;
  /** Classes de cor do traço vetorial SVG ou texto. */
  strokeClass: string;
}

const COLOR_THEMES = {
  red: {
    badgeClass: 'bg-red-500/12 border-red-500/25 dark:bg-red-500/15 dark:border-red-400/25',
    strokeClass: 'text-red-600 dark:text-red-400',
  },
  rose: {
    badgeClass: 'bg-rose-500/12 border-rose-500/25 dark:bg-rose-500/15 dark:border-rose-400/25',
    strokeClass: 'text-rose-600 dark:text-rose-400',
  },
  pink: {
    badgeClass: 'bg-pink-500/12 border-pink-500/25 dark:bg-pink-500/15 dark:border-pink-400/25',
    strokeClass: 'text-pink-600 dark:text-pink-400',
  },
  amber: {
    badgeClass: 'bg-amber-500/12 border-amber-500/25 dark:bg-amber-500/15 dark:border-amber-400/25',
    strokeClass: 'text-amber-600 dark:text-amber-400',
  },
  yellow: {
    badgeClass: 'bg-yellow-500/12 border-yellow-500/30 dark:bg-yellow-500/15 dark:border-yellow-400/25',
    strokeClass: 'text-yellow-700 dark:text-yellow-400',
  },
  orange: {
    badgeClass: 'bg-orange-500/12 border-orange-500/25 dark:bg-orange-500/15 dark:border-orange-400/25',
    strokeClass: 'text-orange-600 dark:text-orange-400',
  },
  emerald: {
    badgeClass: 'bg-emerald-500/12 border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-400/25',
    strokeClass: 'text-emerald-600 dark:text-emerald-400',
  },
  teal: {
    badgeClass: 'bg-teal-500/12 border-teal-500/25 dark:bg-teal-500/15 dark:border-teal-400/25',
    strokeClass: 'text-teal-600 dark:text-teal-400',
  },
  cyan: {
    badgeClass: 'bg-cyan-500/12 border-cyan-500/25 dark:bg-cyan-500/15 dark:border-cyan-400/25',
    strokeClass: 'text-cyan-600 dark:text-cyan-400',
  },
  sky: {
    badgeClass: 'bg-sky-500/12 border-sky-500/25 dark:bg-sky-500/15 dark:border-sky-400/25',
    strokeClass: 'text-sky-600 dark:text-sky-400',
  },
  blue: {
    badgeClass: 'bg-blue-500/12 border-blue-500/25 dark:bg-blue-500/15 dark:border-blue-400/25',
    strokeClass: 'text-blue-600 dark:text-blue-400',
  },
  violet: {
    badgeClass: 'bg-violet-500/12 border-violet-500/25 dark:bg-violet-500/15 dark:border-violet-400/25',
    strokeClass: 'text-violet-600 dark:text-violet-400',
  },
  purple: {
    badgeClass: 'bg-purple-500/12 border-purple-500/25 dark:bg-purple-500/15 dark:border-purple-400/25',
    strokeClass: 'text-purple-600 dark:text-purple-400',
  },
  fuchsia: {
    badgeClass: 'bg-fuchsia-500/12 border-fuchsia-500/25 dark:bg-fuchsia-500/15 dark:border-fuchsia-400/25',
    strokeClass: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  slate: {
    badgeClass: 'bg-slate-500/12 border-slate-500/25 dark:bg-slate-500/15 dark:border-slate-400/25',
    strokeClass: 'text-slate-600 dark:text-slate-400',
  },
  zinc: {
    badgeClass: 'bg-zinc-500/10 border-zinc-400/30 dark:bg-zinc-500/15 dark:border-zinc-600/40',
    strokeClass: 'text-zinc-600 dark:text-zinc-400',
  },
} satisfies Record<string, CategoryIconTheme>;

/**
 * Mapeamento de tema visual suave para todas as 16 categorias {@link CategoryId}.
 */
export const CATEGORY_ICON_THEME: Record<CategoryId, CategoryIconTheme> = {
  hortifruti: COLOR_THEMES.emerald,
  padaria: COLOR_THEMES.amber,
  laticinios: COLOR_THEMES.yellow,
  acougue: COLOR_THEMES.rose,
  mercearia: COLOR_THEMES.orange,
  congelados: COLOR_THEMES.sky,
  bebidas: COLOR_THEMES.blue,
  limpeza: COLOR_THEMES.cyan,
  utilidades: COLOR_THEMES.slate,
  higiene: COLOR_THEMES.teal,
  dermocosmeticos: COLOR_THEMES.fuchsia,
  medicamentos: COLOR_THEMES.red,
  primeiros_socorros: COLOR_THEMES.pink,
  bebe: COLOR_THEMES.violet,
  pet: COLOR_THEMES.purple,
  outros: COLOR_THEMES.zinc,
};

const ICON_COLOR_MAP: Partial<Record<VectorIconKey, CategoryIconTheme>> = {
  apple: COLOR_THEMES.red,
  tomato: COLOR_THEMES.red,
  cherry: COLOR_THEMES.red,
  watermelon: COLOR_THEMES.red,
  beet: COLOR_THEMES.rose,
  ketchup_bottle: COLOR_THEMES.red,
  beef: COLOR_THEMES.rose,
  sausage: COLOR_THEMES.rose,
  bacon: COLOR_THEMES.rose,
  ham: COLOR_THEMES.pink,
  wine: COLOR_THEMES.rose,
  pill: COLOR_THEMES.red,
  pill_blister: COLOR_THEMES.red,
  thermometer: COLOR_THEMES.red,
  bandage: COLOR_THEMES.pink,
  bandage_roll: COLOR_THEMES.pink,
  sanitary_pad: COLOR_THEMES.pink,
  soap_bar: COLOR_THEMES.pink,
  hot_water_bag: COLOR_THEMES.rose,
  condom_pack: COLOR_THEMES.pink,
  rapid_test: COLOR_THEMES.pink,
  banana: COLOR_THEMES.yellow,
  pineapple: COLOR_THEMES.yellow,
  passion_fruit: COLOR_THEMES.yellow,
  corn: COLOR_THEMES.yellow,
  cheese_wedge: COLOR_THEMES.yellow,
  butter_dish: COLOR_THEMES.yellow,
  mango: COLOR_THEMES.orange,
  papaya: COLOR_THEMES.orange,
  carrot: COLOR_THEMES.orange,
  potato: COLOR_THEMES.amber,
  cassava: COLOR_THEMES.amber,
  ginger: COLOR_THEMES.amber,
  onion: COLOR_THEMES.amber,
  garlic: COLOR_THEMES.slate,
  egg: COLOR_THEMES.amber,
  bread_loaf: COLOR_THEMES.amber,
  croissant: COLOR_THEMES.amber,
  cheese_bread: COLOR_THEMES.amber,
  tapioca: COLOR_THEMES.amber,
  pastry_roll: COLOR_THEMES.amber,
  coffee: COLOR_THEMES.amber,
  coffee_capsule: COLOR_THEMES.amber,
  cookie: COLOR_THEMES.amber,
  cake: COLOR_THEMES.amber,
  cake_slice: COLOR_THEMES.amber,
  burger: COLOR_THEMES.orange,
  drumstick: COLOR_THEMES.orange,
  beer: COLOR_THEMES.amber,
  pasta_bowl: COLOR_THEMES.amber,
  olive_oil_bottle: COLOR_THEMES.amber,
  sunscreen_tube: COLOR_THEMES.amber,
  lightbulb: COLOR_THEMES.amber,
  flame: COLOR_THEMES.orange,
  avocado: COLOR_THEMES.emerald,
  broccoli: COLOR_THEMES.emerald,
  chayote: COLOR_THEMES.emerald,
  kiwi: COLOR_THEMES.emerald,
  pear: COLOR_THEMES.emerald,
  salad: COLOR_THEMES.emerald,
  leafy_green: COLOR_THEMES.emerald,
  cucumber: COLOR_THEMES.emerald,
  bell_pepper: COLOR_THEMES.emerald,
  leaf: COLOR_THEMES.emerald,
  vegan: COLOR_THEMES.emerald,
  citrus: COLOR_THEMES.emerald,
  tea_bag: COLOR_THEMES.emerald,
  coconut: COLOR_THEMES.emerald,
  milk_carton: COLOR_THEMES.sky,
  milk: COLOR_THEMES.sky,
  milk_off: COLOR_THEMES.teal,
  water: COLOR_THEMES.blue,
  yogurt_cup: COLOR_THEMES.sky,
  whipped_cream: COLOR_THEMES.sky,
  mouthwash: COLOR_THEMES.teal,
  shampoo_bottle: COLOR_THEMES.teal,
  detergent_bottle: COLOR_THEMES.cyan,
  laundry_box: COLOR_THEMES.cyan,
  aerosol_spray: COLOR_THEMES.cyan,
  snowflake: COLOR_THEMES.sky,
  nasal_spray: COLOR_THEMES.sky,
  eye_drops: COLOR_THEMES.sky,
  syrup_bottle: COLOR_THEMES.blue,
  probiotic_ampoule: COLOR_THEMES.sky,
  toilet_paper: COLOR_THEMES.sky,
  toothpaste: COLOR_THEMES.teal,
  toothbrush: COLOR_THEMES.teal,
  deodorant: COLOR_THEMES.teal,
  fish: COLOR_THEMES.sky,
  grape: COLOR_THEMES.purple,
  eggplant: COLOR_THEMES.purple,
  ice_cream_bowl: COLOR_THEMES.purple,
  perfume_bottle: COLOR_THEMES.fuchsia,
  serum_dropper: COLOR_THEMES.fuchsia,
  nail_polish: COLOR_THEMES.fuchsia,
  diaper: COLOR_THEMES.violet,
  baby_bottle: COLOR_THEMES.violet,
  pacifier: COLOR_THEMES.violet,
  cat_litter: COLOR_THEMES.purple,
  supplement_tub: COLOR_THEMES.orange,
};

/**
 * Retorna a paleta de cores minimalista (fundo + traço) priorizando a cor semântica do produto
 * e utilizando a cor do corredor como fallback.
 *
 * @param iconKey - Chave semântica do ícone vetorial resolvido.
 * @param categoryId - Corredor do item.
 * @returns Tema visual {@link CategoryIconTheme} do produto.
 */
export function getProductColorTheme(
  iconKey: VectorIconKey | null,
  categoryId: CategoryId
): CategoryIconTheme {
  if (iconKey && ICON_COLOR_MAP[iconKey]) {
    return ICON_COLOR_MAP[iconKey]!;
  }
  return CATEGORY_ICON_THEME[categoryId] ?? CATEGORY_ICON_THEME.outros;
}

const VECTOR_ICON_RULES: Array<{ key: VectorIconKey; keywords: string[] }> = [
  // Hortifruti
  { key: 'banana', keywords: ['banana', 'banana prata', 'banana nanica', 'banana da terra'] },
  { key: 'apple', keywords: ['maca', 'maca fuji', 'maca gala', 'goiaba', 'pessego', 'caqui'] },
  { key: 'pear', keywords: ['pera'] },
  { key: 'mango', keywords: ['manga'] },
  { key: 'kiwi', keywords: ['kiwi'] },
  { key: 'papaya', keywords: ['mamao', 'mamao papaya', 'mamao formosa'] },
  { key: 'passion_fruit', keywords: ['maracuja'] },
  { key: 'pineapple', keywords: ['abacaxi'] },
  { key: 'watermelon', keywords: ['melancia', 'melao'] },
  { key: 'avocado', keywords: ['abacate'] },
  { key: 'coconut', keywords: ['coco', 'coco seco', 'coco verde', 'leite de coco'] },
  { key: 'citrus', keywords: ['laranja', 'laranja pera', 'laranja lima', 'limao', 'limao tahiti', 'limao siciliano', 'tangerina', 'mexerica', 'ponkan'] },
  { key: 'grape', keywords: ['uva', 'uva sem semente', 'ameixa', 'jabuticaba', 'mirtilo'] },
  { key: 'cherry', keywords: ['morango', 'cereja', 'amora', 'framboesa'] },
  { key: 'tomato', keywords: ['tomate', 'tomate cereja', 'tomate italiano'] },
  { key: 'onion', keywords: ['cebola', 'cebola roxa'] },
  { key: 'garlic', keywords: ['alho'] },
  { key: 'potato', keywords: ['batata', 'batata inglesa', 'batata doce', 'mandioquinha', 'batata baroa'] },
  { key: 'cassava', keywords: ['mandioca', 'aipim', 'inhame', 'cara'] },
  { key: 'beet', keywords: ['beterraba', 'rabanete', 'nabo'] },
  { key: 'carrot', keywords: ['cenoura'] },
  { key: 'ginger', keywords: ['gengibre'] },
  { key: 'chayote', keywords: ['chuchu'] },
  { key: 'broccoli', keywords: ['brocolis', 'couve flor'] },
  { key: 'corn', keywords: ['milho', 'milho verde', 'milho em conserva'] },
  { key: 'bell_pepper', keywords: ['pimentao', 'pimentao amarelo', 'pimentao vermelho'] },
  { key: 'cucumber', keywords: ['pepino', 'pepino japones', 'abobrinha', 'quiabo', 'vagem'] },
  { key: 'eggplant', keywords: ['berinjela'] },
  { key: 'mushroom', keywords: ['cogumelo', 'champignon', 'shitake', 'shimeji'] },
  { key: 'leafy_green', keywords: ['couve', 'couve manteiga', 'espinafre', 'repolho', 'repolho roxo', 'agriao'] },
  { key: 'salad', keywords: ['alface', 'alface americana', 'alface crespa', 'rucula', 'salada'] },
  { key: 'leaf', keywords: ['cheiro verde', 'salsinha', 'cebolinha', 'coentro', 'manjericao', 'hortela', 'alecrim', 'tomilho', 'louro'] },
  { key: 'egg', keywords: ['ovo', 'ovos', 'ovos brancos', 'ovos caipira', 'ovos de codorna'] },
  { key: 'vegan', keywords: ['tofu', 'soja', 'quinoa', 'grao de bico', 'lentilha', 'edamame'] },

  // Padaria & Matinais
  { key: 'coffee_capsule', keywords: ['cafe em capsula', 'cafe soluvel'] },
  { key: 'coffee', keywords: ['cafe', 'cafe moido', 'cafe descafeinado', 'cappuccino', 'achocolatado', 'toddy', 'nescau', 'ovomaltine', 'filtro de cafe', 'melitta'] },
  { key: 'tea_bag', keywords: ['cha', 'cha de camomila', 'cha verde', 'cha mate'] },
  { key: 'bread_loaf', keywords: ['pao de forma', 'pao integral', 'bisnaguinha', 'pao australiano', 'torrada'] },
  { key: 'cheese_bread', keywords: ['pao frances', 'pao de queijo'] },
  { key: 'tapioca', keywords: ['tapioca', 'goma de tapioca'] },
  { key: 'sandwich', keywords: ['pao de hot dog', 'pao sirio', 'sanduiche'] },
  { key: 'croissant', keywords: ['pao', 'croissant', 'baguete', 'brioche'] },
  { key: 'donut', keywords: ['donut', 'sonho', 'rosca', 'rosquinha'] },
  { key: 'cake', keywords: ['bolo', 'bolo de cenoura', 'bolo de chocolate', 'panetone'] },
  { key: 'cake_slice', keywords: ['broa', 'torta', 'petit gateau', 'pudim'] },
  { key: 'cookie', keywords: ['biscoito', 'biscoito doce', 'bolacha', 'bolacha agua e sal', 'cream cracker', 'agua e sal', 'maizena', 'biscoito recheado', 'cookie', 'wafer', 'granola', 'aveia', 'cereal', 'cereal matinal', 'sucrilhos'] },
  { key: 'jam_jar', keywords: ['geleia', 'mel', 'pasta de amendoim', 'nutella', 'azeitona', 'palmito', 'picles'] },

  // Laticínios & Frios
  { key: 'milk_off', keywords: ['leite sem lactose', 'leite vegetal', 'leite de aveia', 'leite de amendoas', 'leite de soja'] },
  { key: 'milk_carton', keywords: ['leite', 'leite integral', 'leite desnatado', 'leite semidesnatado', 'creme de leite', 'leite condensado'] },
  { key: 'milk', keywords: ['leite em po', 'ninho', 'coalhada'] },
  { key: 'whipped_cream', keywords: ['chantilly'] },
  { key: 'pastry_roll', keywords: ['massa de pastel', 'massa folhada'] },
  { key: 'yogurt_cup', keywords: ['iogurte', 'iogurte natural', 'iogurte grego', 'danone', 'activia', 'yakult', 'leite fermentado'] },
  { key: 'butter_dish', keywords: ['manteiga', 'margarina', 'qualy', 'requeijao', 'cream cheese', 'catupiry', 'nata', 'pate'] },
  { key: 'cheese_wedge', keywords: ['queijo', 'mussarela', 'mucarela', 'queijo prato', 'parmesao', 'queijo minas', 'minas frescal', 'ricota', 'cottage', 'provolone', 'gorgonzola', 'cheddar', 'brie', 'coalho'] },
  { key: 'ham', keywords: ['presunto', 'peito de peru', 'salame', 'mortadela', 'blanquet', 'copa', 'pernil', 'bisteca', 'bisteca suina', 'lombo', 'lombo suino', 'costelinha suina'] },

  // Açougue & Peixaria
  { key: 'burger', keywords: ['hamburguer', 'hamburguer congelado', 'pao de hamburguer'] },
  { key: 'sausage', keywords: ['linguica', 'calabresa', 'linguica toscana', 'linguica calabresa', 'salsicha', 'paio'] },
  { key: 'bacon', keywords: ['bacon', 'pancetta'] },
  { key: 'drumstick', keywords: ['frango', 'peito de frango', 'file de frango', 'coxa', 'sobrecoxa', 'coxa e sobrecoxa', 'asa', 'asa de frango', 'drumet', 'tulipa', 'sassami', 'peru', 'chester', 'nuggets', 'empanado'] },
  { key: 'fish', keywords: ['peixe', 'tilapia', 'salmao', 'merluza', 'bacalhau', 'camarao', 'lula', 'atum', 'atum em lata', 'sardinha', 'sardinha em lata'] },
  { key: 'beef', keywords: ['carne', 'carne moida', 'patinho', 'alcatra', 'contrafile', 'file mignon', 'picanha', 'maminha', 'fraldinha', 'acem', 'musculo', 'costela', 'costela bovina', 'bife', 'cupim', 'lagarto', 'coxao mole', 'coxao duro', 'carne seca', 'charque', 'porco', 'kibe', 'almondega'] },

  // Mercearia
  { key: 'bean', keywords: ['feijao', 'feijao carioca', 'feijao preto', 'feijao fradinho', 'ervilha', 'ervilha seca'] },
  { key: 'rice_bag', keywords: ['arroz', 'arroz branco', 'arroz integral', 'arroz parboilizado', 'arroz arboreo', 'farinha', 'farinha de trigo', 'farinha de mandioca', 'farinha de rosca', 'farofa', 'fuba', 'amido', 'amido de milho', 'polvilho', 'cuscuz', 'flocao', 'flocao de milho', 'acucar', 'acucar refinado', 'acucar cristal', 'acucar demerara', 'acucar mascavo', 'coco ralado'] },
  { key: 'baking_powder', keywords: ['fermento', 'fermento em po', 'fermento biologico', 'bicarbonato'] },
  { key: 'pasta_bowl', keywords: ['macarrao', 'macarrao espaguete', 'macarrao penne', 'macarrao parafuso', 'espaguete', 'penne', 'parafuso', 'fusilli', 'talharim', 'miojo', 'lamen', 'lasanha', 'massa de lasanha', 'nhoque'] },
  { key: 'olive_oil_bottle', keywords: ['azeite', 'azeite de oliva', 'oleo', 'oleo de soja', 'oleo de girassol', 'oleo de coco', 'vinagre', 'shoyu'] },
  { key: 'ketchup_bottle', keywords: ['ketchup', 'mostarda', 'maionese', 'barbecue', 'molho de pimenta'] },
  { key: 'salt_shaker', keywords: ['sal', 'sal refinado', 'sal grosso', 'sal rosa', 'oregano', 'paprica', 'pimenta do reino', 'cominho', 'curcuma', 'tempero'] },
  { key: 'soup', keywords: ['sopa', 'sopao', 'caldo knorr', 'molho de tomate', 'extrato de tomate', 'passata'] },
  { key: 'popcorn', keywords: ['pipoca', 'milho de pipoca', 'salgadinho', 'doritos', 'ruffles', 'chips', 'batata palha'] },
  { key: 'nut', keywords: ['amendoim', 'castanha', 'castanha de caju', 'nozes', 'amendoa'] },
  { key: 'lollipop', keywords: ['bala', 'chiclete', 'pirulito', 'gelatina'] },
  { key: 'candy', keywords: ['chocolate', 'chocolate em po', 'cacau', 'bombom'] },
  { key: 'eye_drops', keywords: ['adocante', 'stevia', 'xilitol', 'colirio', 'colirio lubrificante', 'lacrima', 'systane', 'dipirona gotas'] },

  // Congelados
  { key: 'pizza', keywords: ['pizza', 'pizza congelada', 'massa de pizza'] },
  { key: 'popsicle', keywords: ['picole'] },
  { key: 'ice_cream_bowl', keywords: ['acai', 'torta congelada'] },
  { key: 'ice_cream_cone', keywords: ['sorvete'] },
  { key: 'snowflake', keywords: ['gelo', 'congelado', 'congelados', 'polpa', 'polpa de fruta', 'legumes congelados', 'batata frita', 'batata frita congelada', 'pao de alho'] },

  // Bebidas
  { key: 'juice_box', keywords: ['suco', 'suco de laranja', 'suco de uva', 'del valle', 'agua de coco'] },
  { key: 'soda_can', keywords: ['refrigerante', 'refrigerante cola', 'refrigerante limao', 'coca', 'coca cola', 'coca zero', 'guarana', 'guarana antarctica', 'fanta', 'sprite', 'pepsi', 'energetico', 'red bull', 'monster', 'copo descartavel'] },
  { key: 'beer', keywords: ['cerveja', 'cerveja zero', 'heineken', 'brahma', 'skol', 'antarctica', 'amstel', 'stella', 'corona', 'budweiser', 'spaten'] },
  { key: 'wine', keywords: ['vinho', 'vinho tinto', 'vinho branco', 'espumante', 'prosecco'] },
  { key: 'martini', keywords: ['gin', 'vodka', 'whisky', 'campari', 'aperol', 'agua tonica'] },
  { key: 'water', keywords: ['agua', 'agua mineral', 'agua com gas'] },
  { key: 'soda', keywords: ['cha gelado', 'ice tea', 'isotonico', 'gatorade', 'kombucha'] },

  // Limpeza
  { key: 'laundry_box', keywords: ['sabao em po', 'omo', 'ariel', 'tixan', 'brilhante', 'tira manchas', 'vanish'] },
  { key: 'detergent_bottle', keywords: ['detergente', 'ype', 'limpol', 'sabao liquido', 'amaciante', 'downy', 'comfort', 'agua sanitaria', 'candida', 'qboa', 'cloro', 'alvejante'] },
  { key: 'sponge', keywords: ['esponja', 'esponja de louca', 'scotch brite', 'bombril', 'palha de aco', 'pano de chao', 'perfex', 'flanela'] },
  { key: 'broom', keywords: ['vassoura', 'rodo', 'pa de lixo'] },
  { key: 'toilet', keywords: ['pastilha sanitaria', 'pato purific'] },
  { key: 'trash', keywords: ['saco de lixo', 'saco de lixo 30l', 'saco de lixo 50l', 'saco de lixo 100l'] },
  { key: 'aerosol_spray', keywords: ['inseticida', 'sbp', 'raid', 'odorizador', 'odorizador de ambiente', 'glade', 'bom ar', 'antisseptico spray'] },
  { key: 'spray', keywords: ['desinfetante', 'pinho sol', 'lysoform', 'veja', 'multiuso', 'desengordurante', 'cif', 'limpa vidros', 'lustra moveis'] },

  // Utilidades & Casa
  { key: 'foil_roll', keywords: ['papel aluminio', 'filme pvc', 'papel manteiga', 'saco freezer', 'saco zip', 'ziploc'] },
  { key: 'toothpick_box', keywords: ['palito de dente'] },
  { key: 'tape_roll', keywords: ['fita adesiva', 'durex', 'fita crepe'] },
  { key: 'glue_tube', keywords: ['super cola', 'super bonder'] },
  { key: 'hanger', keywords: ['cabide', 'prendedor de roupa'] },
  { key: 'flame', keywords: ['carvao', 'fosforo', 'isqueiro', 'bic', 'acendedor', 'vela'] },
  { key: 'battery', keywords: ['pilha', 'pilha aa', 'pilha aaa', 'bateria'] },
  { key: 'lightbulb', keywords: ['lampada', 'lampada led', 'extensao eletrica', 'adaptador tomada'] },
  { key: 'scissors', keywords: ['tesoura', 'cortador de unha', 'lixa de unha'] },
  { key: 'tweezers', keywords: ['pinca'] },

  // Higiene Pessoal & Dermocosméticos
  { key: 'toilet_paper', keywords: ['papel higienico', 'papel toalha', 'guardanapo', 'lenco de papel', 'kleenex'] },
  { key: 'toothpaste', keywords: ['pasta de dente', 'creme dental', 'colgate', 'sensodyne', 'oral b', 'pomada', 'pomada anti inflamatoria', 'pomada antibiotica', 'pomada de assadura', 'nebacetin', 'cataflam', 'bepantol', 'hipoglos'] },
  { key: 'toothbrush', keywords: ['escova de dente', 'fio dental'] },
  { key: 'mouthwash', keywords: ['enxaguante', 'enxaguante bucal', 'listerine', 'agua micelar', 'bioderma', 'demaquilante'] },
  { key: 'shampoo_bottle', keywords: ['shampoo', 'xampu', 'condicionador', 'creme de pentear', 'mascara capilar', 'sabonete liquido', 'sabonete facial', 'gel de limpeza facial', 'sabonete bebe', 'shampoo bebe'] },
  { key: 'soap_bar', keywords: ['sabonete', 'sabonete em barra', 'sabao em barra', 'sabao', 'protex', 'dove'] },
  { key: 'deodorant', keywords: ['desodorante', 'desodorante aerosol', 'desodorante roll on', 'rexona', 'old spice', 'repelente', 'off', 'exposis'] },
  { key: 'razor', keywords: ['aparelho de barbear', 'barbeador', 'gillette', 'prestobarba', 'lamina', 'lamina de barbear', 'espuma de barbear'] },
  { key: 'cotton_swab', keywords: ['cotonete', 'haste flexivel', 'algodao', 'cotonete bebe'] },
  { key: 'sanitary_pad', keywords: ['absorvente', 'sempre livre', 'intimus', 'protetor diario'] },
  { key: 'sunscreen_tube', keywords: ['protetor solar', 'protetor solar facial', 'protetor solar corporal', 'la roche', 'anthelios', 'isdin', 'hidratante', 'hidratante corporal', 'hidratante facial', 'hidratante labial', 'creme para maos', 'cerave', 'cetaphil', 'neutrogena'] },
  { key: 'serum_dropper', keywords: ['acido hialuronico', 'retinol', 'niacinamida', 'serum vitamina c'] },
  { key: 'perfume_bottle', keywords: ['perfume', 'colonia', 'body splash', 'oleo corporal'] },
  { key: 'nail_polish', keywords: ['esmalte', 'acetona', 'removedor de esmalte', 'tinta de cabelo'] },
  { key: 'hand', keywords: ['luva de limpeza', 'luva descartavel', 'alcool em gel'] },

  // Medicamentos & Primeiros Socorros
  { key: 'nasal_spray', keywords: ['sorine', 'neosoro', 'rinosoro', 'naridrin', 'spray nasal', 'descongestionante', 'busonid', 'avamys', 'soro nasal bebe'] },
  { key: 'syrup_bottle', keywords: ['xarope', 'xarope para tosse', 'soro fisiologico', 'agua oxigenada', 'clorexidina', 'alcool', 'alcool 70'] },
  { key: 'probiotic_ampoule', keywords: ['probiotico', 'floratil', 'enterogermina'] },
  { key: 'supplement_tub', keywords: ['creatina', 'whey', 'whey protein', 'colageno'] },
  { key: 'pill_bottle', keywords: ['vitamina', 'vitamina c', 'vitamina d', 'complexo b', 'magnesio', 'omega 3', 'melatonina'] },
  { key: 'pill_blister', keywords: ['dorflex', 'neosaldina', 'buscopan', 'omeprazol', 'pantoprazol', 'loratadina', 'antialergico', 'allegra', 'benegrip', 'resfenol', 'cimegripe', 'antigripal', 'pastilha', 'pastilha garganta', 'strepsils', 'benalet', 'sal de frutas', 'eno', 'antiacido'] },
  { key: 'pill', keywords: ['dipirona', 'dipirona 500mg', 'dipirona 1g', 'novalgina', 'paracetamol', 'tylenol', 'ibuprofeno', 'advil', 'dramin', 'imosec', 'losartana', 'metformina', 'sinvastatina', 'amoxicilina', 'azitromicina', 'remedio', 'comprimido', 'capsula'] },
  { key: 'stethoscope', keywords: ['aparelho de pressao', 'oximetro'] },
  { key: 'thermometer', keywords: ['termometro', 'termometro digital'] },
  { key: 'hot_water_bag', keywords: ['bolsa termica', 'bolsa de gelo'] },
  { key: 'syringe', keywords: ['seringa', 'agulha'] },
  { key: 'bandage_roll', keywords: ['esparadrapo', 'micropore', 'gaze', 'gaze esteril', 'atadura', 'faixa', 'compressa'] },
  { key: 'bandage', keywords: ['band aid', 'bandaid', 'curativo', 'curativo transparente'] },
  { key: 'surgical_mask', keywords: ['mascara cirurgica', 'mascara descartavel'] },
  { key: 'condom_pack', keywords: ['preservativo', 'camisinha'] },
  { key: 'rapid_test', keywords: ['teste de gravidez', 'teste covid'] },
  { key: 'shield_plus', keywords: ['merthiolate', 'antisseptico'] },

  // Bebê & Pet
  { key: 'diaper', keywords: ['fralda', 'fralda p', 'fralda m', 'fralda g', 'fralda xg', 'pampers', 'huggies', 'lenco umedecido', 'lenco umedecido bebe'] },
  { key: 'baby_bottle', keywords: ['mamadeira', 'formula infantil', 'leite nan', 'nan', 'aptamil', 'nestogeno', 'papinha'] },
  { key: 'pacifier', keywords: ['chupeta', 'mordedor'] },
  { key: 'cat_litter', keywords: ['areia de gato', 'areia sanitaria', 'pipicat', 'tapete higienico'] },
  { key: 'pet_food_bag', keywords: ['racao', 'racao cachorro', 'racao gato', 'sache gato', 'sache cachorro'] },
  { key: 'cat', keywords: ['whiskas'] },
  { key: 'dog', keywords: ['petisco cachorro', 'biscoito cachorro', 'pedigree', 'saquinho cata caca'] },
  { key: 'bone', keywords: ['petisco', 'ossinho'] },
  { key: 'paw', keywords: ['antipulgas', 'simparic', 'bravecto', 'shampoo pet', 'pet'] },
];

const EXACT_ICON_MAP = new Map<string, VectorIconKey>();
for (const rule of VECTOR_ICON_RULES) {
  for (const kw of rule.keywords) {
    if (!EXACT_ICON_MAP.has(kw)) {
      EXACT_ICON_MAP.set(kw, rule.key);
    }
  }
}

const ICON_RESOLUTION_CACHE = new Map<string, ResolvedItemIcon>();
const MAX_ICON_CACHE_SIZE = 500;

/**
 * Resolve o ícone vetorial minimalista de um produto (100% SVG, zero emojis):
 * 1) lookup O(1) exato + cache limitado para nomes compostos;
 * 2) match por palavra inteira (priorizando a frase mais longa) em ~155 ícones vetoriais minimalistas;
 * 3) retorna `{ kind: 'monogram' }` apenas para itens personalizados desconhecidos digitados pelo usuário.
 *
 * @param itemName - Nome do item (digitado ou do catálogo).
 * @returns Objeto {@link ResolvedItemIcon} pronto para renderização minimalista.
 */
export function resolveItemIcon(itemName: string): ResolvedItemIcon {
  const norm = normalizeText(itemName);
  if (!norm) return { kind: 'monogram' };

  const cached = ICON_RESOLUTION_CACHE.get(norm);
  if (cached) return cached;

  const exactKey = EXACT_ICON_MAP.get(norm);
  let resolved: ResolvedItemIcon;
  if (exactKey) {
    resolved = { kind: 'svg', key: exactKey };
  } else {
    let bestMatch: { len: number; key: VectorIconKey } | null = null;
    for (const rule of VECTOR_ICON_RULES) {
      for (const kw of rule.keywords) {
        if (hasWholePhrase(norm, kw) && (!bestMatch || kw.length > bestMatch.len)) {
          bestMatch = { len: kw.length, key: rule.key };
        }
      }
    }
    resolved = bestMatch ? { kind: 'svg', key: bestMatch.key } : { kind: 'monogram' };
  }

  if (ICON_RESOLUTION_CACHE.size >= MAX_ICON_CACHE_SIZE) {
    const oldestKey = ICON_RESOLUTION_CACHE.keys().next().value;
    if (oldestKey !== undefined) {
      ICON_RESOLUTION_CACHE.delete(oldestKey);
    }
  }
  ICON_RESOLUTION_CACHE.set(norm, resolved);
  return resolved;
}

/**
 * Extrai até 2 iniciais maiúsculas limpas de um nome de item para o Monograma Minimalista.
 *
 * @param itemName - Nome visível do item.
 * @returns String com 1 ou 2 letras maiúsculas (ex.: `"Adaptador USB"` → `"AU"`, `"Cadeado"` → `"CA"`).
 */
export function getItemMonogram(itemName: string): string {
  const words = normalizeText(itemName)
    .split(' ')
    .filter((w) => w.length > 0 && !['de', 'da', 'do', 'para', 'com', 'e'].includes(w));

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return '?';
}
