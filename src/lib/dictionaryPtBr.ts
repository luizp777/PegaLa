import type { CategoryDefinition, CategoryId } from '../types';

/**
 * Lista ordenada de todas as 16 categorias/corredores suportados para mercado e farmácia.
 */
export const CATEGORIES: CategoryDefinition[] = [
  { id: 'hortifruti', label: 'Hortifruti', shortLabel: 'Hortifrúti', order: 1, colorClass: 'text-emerald-700 dark:text-emerald-400' },
  { id: 'padaria', label: 'Padaria & Matinais', shortLabel: 'Padaria', order: 2, colorClass: 'text-amber-700 dark:text-amber-400' },
  { id: 'laticinios', label: 'Laticínios & Frios', shortLabel: 'Laticínios', order: 3, colorClass: 'text-yellow-700 dark:text-yellow-400' },
  { id: 'acougue', label: 'Açougue & Peixaria', shortLabel: 'Açougue', order: 4, colorClass: 'text-rose-700 dark:text-rose-400' },
  { id: 'mercearia', label: 'Mercearia', shortLabel: 'Mercearia', order: 5, colorClass: 'text-orange-700 dark:text-orange-400' },
  { id: 'congelados', label: 'Congelados', shortLabel: 'Congelados', order: 6, colorClass: 'text-sky-700 dark:text-sky-400' },
  { id: 'bebidas', label: 'Bebidas', shortLabel: 'Bebidas', order: 7, colorClass: 'text-blue-700 dark:text-blue-400' },
  { id: 'limpeza', label: 'Limpeza', shortLabel: 'Limpeza', order: 8, colorClass: 'text-cyan-700 dark:text-cyan-400' },
  { id: 'utilidades', label: 'Utilidades & Casa', shortLabel: 'Utilidades', order: 9, colorClass: 'text-slate-700 dark:text-slate-400' },
  { id: 'higiene', label: 'Higiene Pessoal', shortLabel: 'Higiene', order: 10, colorClass: 'text-teal-700 dark:text-teal-400' },
  { id: 'dermocosmeticos', label: 'Dermocosméticos & Beleza', shortLabel: 'Dermocosm.', order: 11, colorClass: 'text-fuchsia-700 dark:text-fuchsia-400' },
  { id: 'medicamentos', label: 'Medicamentos & Saúde', shortLabel: 'Remédios', order: 12, colorClass: 'text-red-700 dark:text-red-400' },
  { id: 'primeiros_socorros', label: 'Primeiros Socorros', shortLabel: '1º Socorros', order: 13, colorClass: 'text-pink-700 dark:text-pink-400' },
  { id: 'bebe', label: 'Bebê', shortLabel: 'Bebê', order: 14, colorClass: 'text-violet-700 dark:text-violet-400' },
  { id: 'pet', label: 'Pet', shortLabel: 'Pet', order: 15, colorClass: 'text-purple-700 dark:text-purple-400' },
  { id: 'outros', label: 'Outros', shortLabel: 'Outros', order: 99, colorClass: 'text-zinc-600 dark:text-zinc-400' },
];

/**
 * Mapa de acesso O(1) de {@link CategoryId} para sua definição completa {@link CategoryDefinition}.
 */
export const CATEGORY_MAP: Record<CategoryId, CategoryDefinition> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, CategoryDefinition>;

/**
 * Normaliza um texto removendo acentos, pontuações e convertendo para minúsculas.
 *
 * @param text - Texto original a ser normalizado.
 * @returns String limpa adequada para comparações e chaves de índice.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const KEYWORD_GROUPS: Record<CategoryId, string[]> = {
  hortifruti: [
    'banana', 'banana prata', 'banana nanica', 'banana da terra', 'maca', 'maca fuji', 'maca gala',
    'laranja', 'laranja pera', 'laranja lima', 'limao', 'limao tahiti', 'limao siciliano',
    'mamao', 'mamao papaya', 'mamao formosa', 'melancia', 'melao', 'uva', 'uva sem semente',
    'morango', 'abacaxi', 'abacate', 'manga', 'pera', 'kiwi', 'goiaba', 'maracuja', 'pessego',
    'ameixa', 'tangerina', 'mexerica', 'ponkan', 'coco', 'coco seco', 'coco verde', 'caqui',
    'jabuticaba', 'cereja', 'amora', 'framboesa', 'mirtilo', 'tomate', 'tomate cereja',
    'tomate italiano', 'cebola', 'cebola roxa', 'alho', 'batata', 'batata inglesa', 'batata doce',
    'batata baroa', 'mandioquinha', 'cenoura', 'beterraba', 'alface', 'alface americana',
    'alface crespa', 'rucula', 'agriao', 'couve', 'couve manteiga', 'espinafre', 'brocolis',
    'couve flor', 'repolho', 'repolho roxo', 'pepino', 'pepino japones', 'pimentao',
    'pimentao amarelo', 'pimentao vermelho', 'abobrinha', 'abobora', 'abobora cabotia',
    'berinjela', 'chuchu', 'quiabo', 'vagem', 'jiló', 'jilo', 'milho verde', 'mandioca', 'aipim',
    'inhame', 'cara', 'rabanete', 'nabo', 'cheiro verde', 'salsinha', 'cebolinha', 'coentro',
    'manjericao', 'hortela', 'alecrim', 'tomilho', 'gengibre', 'pimenta', 'pimenta dedo de moca',
    'champignon', 'cogumelo', 'shitake', 'shimeji', 'ovo', 'ovos', 'ovos brancos', 'ovos caipira',
    'ovos de codorna', 'palmito fresco', 'aspargo',
  ],
  padaria: [
    'pao', 'pao frances', 'pao de forma', 'pao integral', 'pao de queijo', 'bisnaguinha',
    'pao australiano', 'pao sirio', 'pao de hamburguer', 'pao de hot dog', 'torrada', 'bolo',
    'bolo de cenoura', 'bolo de chocolate', 'broa', 'croissant', 'sonho', 'rosca', 'donut',
    'brioche', 'baguete', 'tapioca', 'goma de tapioca', 'granola', 'aveia', 'aveia em flocos',
    'cereal', 'sucrilhos', 'biscoito', 'bolacha', 'cream cracker', 'agua e sal', 'maizena',
    'biscoito recheado', 'cookie', 'wafer', 'rosquinha', 'geleia', 'mel', 'pasta de amendoim',
    'nutella', 'achocolatado', 'toddy', 'nescau', 'ovomaltine', 'cafe', 'cafe moido',
    'cafe em capsula', 'cafe soluvel', 'cafe descafeinado', 'cha', 'cha de camomila',
    'cha verde', 'cha mate', 'cappuccino', 'panetone',
  ],
  laticinios: [
    'leite', 'leite integral', 'leite desnatado', 'leite semidesnatado', 'leite sem lactose',
    'leite em po', 'ninho', 'leite condensado', 'creme de leite', 'manteiga', 'margarina',
    'qualy', 'requeijao', 'cream cheese', 'iogurte', 'iogurte natural', 'iogurte grego',
    'danone', 'activia', 'yakult', 'leite fermentado', 'queijo', 'mussarela', 'mucarela',
    'queijo prato', 'parmesao', 'queijo minas', 'minas frescal', 'ricota', 'cottage',
    'provolone', 'gorgonzola', 'cheddar', 'brie', 'coalho', 'catupiry', 'presunto',
    'peito de peru', 'salame', 'mortadela', 'blanquet', 'copa', 'pate', 'nata', 'chantilly',
    'coalhada', 'leite vegetal', 'leite de aveia', 'leite de amendoas', 'leite de soja',
    'tofu', 'massa de pastel', 'massa de pizza', 'massa folhada',
  ],
  acougue: [
    'carne', 'carne moida', 'patinho', 'alcatra', 'contrafile', 'file mignon', 'picanha',
    'maminha', 'fraldinha', 'acem', 'musculo', 'costela', 'bife', 'cupim', 'lagarto',
    'coxao mole', 'coxao duro', 'carne seca', 'charque', 'frango', 'peito de frango',
    'file de frango', 'sassami', 'coxa', 'sobrecoxa', 'coxa e sobrecoxa', 'asa', 'drumet',
    'tulipa', 'frango inteiro', 'peru', 'chester', 'porco', 'lombo', 'lombo suino',
    'bisteca', 'pernil', 'costelinha suina', 'pancetta', 'linguica', 'calabresa',
    'linguica toscana', 'paio', 'salsicha', 'bacon', 'peixe', 'tilapia', 'salmao',
    'merluza', 'bacalhau', 'camarao', 'atum', 'sardinha', 'lula', 'hamburguer', 'kibe',
    'almondega',
  ],
  mercearia: [
    'arroz', 'arroz branco', 'arroz integral', 'arroz parboilizado', 'arroz arboreo',
    'feijao', 'feijao carioca', 'feijao preto', 'feijao fradinho', 'lentilha', 'grao de bico',
    'ervilha seca', 'soja', 'quinoa', 'macarrao', 'espaguete', 'penne', 'parafuso', 'fusilli',
    'talharim', 'miojo', 'lamen', 'lasanha', 'nhoque', 'farinha', 'farinha de trigo',
    'farinha de mandioca', 'farinha de rosca', 'farinha panko', 'farofa', 'fuba', 'amido',
    'amido de milho', 'polvilho', 'polvilho azedo', 'polvilho doce', 'cuscuz', 'flocao',
    'acucar', 'acucar refinado', 'acucar cristal', 'acucar demerara', 'acucar mascavo',
    'adocante', 'stevia', 'xilitol', 'sal', 'sal refinado', 'sal grosso', 'sal rosa',
    'oleo', 'oleo de soja', 'oleo de girassol', 'oleo de coco', 'azeite', 'azeite de oliva',
    'vinagre', 'molho de tomate', 'passata', 'extrato de tomate', 'ketchup', 'mostarda',
    'maionese', 'shoyu', 'molho ingles', 'molho de pimenta', 'barbecue', 'tempero',
    'caldo knorr', 'oregano', 'cominho', 'paprica', 'curcuma', 'acafrao', 'pimenta do reino',
    'canela', 'cravo', 'noz moscada', 'louro', 'colorau', 'milho', 'milho em conserva',
    'ervilha', 'azeitona', 'palmito', 'picles', 'fermento', 'fermento biologico',
    'bicarbonato', 'chocolate', 'chocolate em po', 'cacau', 'bombom', 'bala', 'chiclete',
    'pipoca', 'milho de pipoca', 'amendoim', 'castanha', 'castanha de caju', 'nozes',
    'amendoa', 'uva passa', 'batata palha', 'salgadinho', 'doritos', 'ruffles', 'chips',
    'leite de coco', 'coco ralado', 'gelatina', 'pudim', 'sopa', 'sopao', 'azeite dende',
  ],
  congelados: [
    'sorvete', 'acai', 'picole', 'pizza congelada', 'nuggets', 'empanado', 'batata frita',
    'batata mccain', 'polenta', 'pao de alho', 'legumes congelados', 'brocolis congelado',
    'hamburguer congelado', 'lasanha congelada', 'escondidinho', 'strogonoff congelado',
    'gelo', 'polpa', 'polpa de fruta', 'petit gateau', 'torta congelada', 'edamame',
  ],
  bebidas: [
    'agua', 'agua com gas', 'agua mineral', 'agua de coco', 'agua tonica', 'h2oh',
    'refrigerante', 'coca', 'coca cola', 'coca zero', 'guarana', 'guarana antarctica',
    'fanta', 'sprite', 'pepsi', 'soda', 'suco', 'suco de laranja', 'suco de uva',
    'del valle', 'cerveja', 'cerveja zero', 'heineken', 'brahma', 'skol', 'antarctica',
    'amstel', 'stella', 'corona', 'budweiser', 'spaten', 'vinho', 'vinho tinto',
    'vinho branco', 'espumante', 'prosecco', 'gin', 'vodka', 'whisky', 'campari',
    'aperol', 'energetico', 'red bull', 'monster', 'isotonico', 'gatorade', 'powerade',
    'cha gelado', 'ice tea', 'kombucha',
  ],
  limpeza: [
    'detergente', 'ype', 'limpol', 'sabao', 'sabao em po', 'sabao liquido', 'sabao em barra',
    'omo', 'ariel', 'tixan', 'brilhante', 'amaciante', 'downy', 'comfort', 'agua sanitaria',
    'candida', 'qboa', 'cloro', 'alvejante', 'desinfetante', 'pinho sol', 'lysoform',
    'veja', 'multiuso', 'desengordurante', 'cif', 'limpa vidros', 'alcool', 'alcool 70',
    'esponja', 'scotch brite', 'bombril', 'palha de aco', 'pano de chao', 'pano multiuso',
    'perfex', 'flanela', 'saco de lixo', 'saco de lixo 30l', 'saco de lixo 50l',
    'saco de lixo 100l', 'papel toalha', 'guardanapo', 'inseticida', 'sbp', 'raid',
    'lustra moveis', 'poliflor', 'cera', 'vassoura', 'rodo', 'pa de lixo', 'luva de limpeza',
    'tira manchas', 'vanish', 'odorizador', 'glade', 'bom ar', 'pastilha sanitaria',
    'pato purific', 'limpa aluminio', 'sapólio', 'sapolio',
  ],
  utilidades: [
    'papel aluminio', 'filme pvc', 'papel manteiga', 'saco freezer', 'saco zip', 'ziploc',
    'filtro de cafe', 'melitta', 'palito de dente', 'fosforo', 'isqueiro', 'bic', 'carvao',
    'acendedor', 'vela', 'pilha', 'pilha aa', 'pilha aaa', 'bateria', 'lampada', 'lampada led',
    'fita adesiva', 'durex', 'fita crepe', 'super bonder', 'super cola', 'prendedor de roupa',
    'cabide', 'copo descartavel', 'prato descartavel', 'talher descartavel', 'canudo',
    'marmita', 'pote plastico', 'extensao eletrica', 'adaptador tomada', 'cadeado',
  ],
  higiene: [
    'papel higienico', 'neve', 'personal', 'sabonete', 'sabonete liquido', 'protex', 'dove',
    'lux', 'shampoo', 'xampu', 'condicionador', 'creme de cabelo', 'creme de pentear',
    'mascara capilar', 'pasta de dente', 'creme dental', 'colgate', 'sensodyne', 'oral b',
    'escova de dente', 'fio dental', 'enxaguante bucal', 'listerine', 'desodorante',
    'rexona', 'nivea', 'old spice', 'absorvente', 'sempre livre', 'intimus', 'protetor diario',
    'ob', 'coletor menstrual', 'cotonete', 'haste flexivel', 'algodao', 'lenco de papel',
    'kleenex', 'barbeador', 'gillette', 'prestobarba', 'lamina', 'espuma de barbear',
    'gel de barbear', 'pos barba', 'repelente', 'off', 'exposis', 'alcool em gel',
    'fio dental infantil', 'desodorante sem aluminio',
  ],
  dermocosmeticos: [
    'protetor solar', 'protetor solar facial', 'la roche', 'anthelios', 'isdin', 'bepantol',
    'hidratante', 'hidratante corporal', 'hidratante facial', 'cerave', 'cetaphil',
    'neutrogena', 'hidratante labial', 'carmex', 'nivea lip', 'agua micelar', 'bioderma',
    'sabonete facial', 'gel de limpeza facial', 'effaclar', 'actine', 'vitamina c serum',
    'serum facial', 'retinol', 'niacinamida', 'acido hialuronico', 'demaquilante',
    'oleo corporal', 'bio oil', 'creme para maos', 'creme para pes', 'acetona',
    'removedor de esmalte', 'esmalte', 'base de unha', 'lixa de unha', 'pinca',
    'cortador de unha', 'perfume', 'colonia', 'body splash', 'tonico capilar', 'tinta de cabelo',
  ],
  medicamentos: [
    'dipirona', 'dipirona 500mg', 'dipirona 1g', 'dipirona gotas', 'novalgina', 'paracetamol',
    'tylenol', 'ibuprofeno', 'advil', 'alivium', 'dorflex', 'neosaldina', 'buscopan',
    'buscoduo', 'omeprazol', 'pantoprazol', 'esomeprazol', 'eno', 'sal de frutas',
    'estomazil', 'epocler', 'engov', 'antiacido', 'pepsamar', 'gaviscon', 'losartana',
    'atenolol', 'metformina', 'glifage', 'sinvastatina', 'rosuvastatina', 'amoxicilina',
    'azitromicina', 'antialergico', 'loratadina', 'allegra', 'polaramine', 'desloratadina',
    'histamin', 'celestamine', 'predsim', 'benegrip', 'resfenol', 'cimegripe', 'vick',
    'xarope', 'xarope para tosse', 'expec', 'bisolvon', 'pastilha', 'strepsils',
    'benalet', 'neolefrin', 'sorine', 'neosoro', 'rinosoro', 'naridrin', 'spray nasal',
    'budesonida', 'busonid', 'avamys', 'colirio', 'lacrima', 'systane', 'dramin', 'vonau',
    'plasil', 'imosec', 'floratil', 'repoflor', 'enterogermina', 'vitamina', 'vitamina c',
    'vitamina d', 'vitamina b12', 'complexo b', 'magnesio', 'melatonina', 'omega 3',
    'ferro', 'zinco', 'calcio', 'creatina', 'whey', 'whey protein', 'colageno', 'remedio',
    'comprimido', 'capsula', 'pomada', 'nebacetin', 'cataflam', 'salonpas', 'voltaren',
    'antigripal', 'analgesico', 'antibiotico', 'antiinflamatorio', 'nimesulida', 'cetoprofeno',
    'torsilax', 'relaxante muscular', 'descongestionante',
  ],
  primeiros_socorros: [
    'band aid', 'bandaid', 'curativo', 'curativo transparente', 'esparadrapo', 'micropore',
    'gaze', 'gaze esteril', 'atadura', 'faixa', 'soro fisiologico', 'agua oxigenada',
    'merthiolate', 'mertiolate', 'antisseptico', 'clorexidina', 'riodeine', 'termometro',
    'termometro digital', 'seringa', 'agulha', 'luva descartavel', 'mascara descartavel',
    'mascara cirurgica', 'compressa', 'bolsa termica', 'bolsa de gelo', 'oximetro',
    'aparelho de pressao', 'tiras de glicemia', 'preservativo', 'camisinha', 'lubrificante',
    'teste de gravidez', 'teste covid',
  ],
  bebe: [
    'fralda', 'fralda p', 'fralda m', 'fralda g', 'fralda xg', 'fralda xxg', 'pampers',
    'huggies', 'pomada de assadura', 'hipoglos', 'bepantol baby', 'leite nan', 'nan',
    'aptamil', 'nestogeno', 'formula infantil', 'mamadeira', 'chupeta', 'bico de mamadeira',
    'papinha', 'mucilon', 'lenco umedecido', 'lenco umedecido bebe', 'sabonete bebe',
    'shampoo bebe', 'johnson baby', 'cotonete bebe', 'soro nasal bebe', 'aspirador nasal',
    'mordedor', 'copo de treinamento',
  ],
  pet: [
    'racao', 'racao cachorro', 'racao gato', 'pedigree', 'whiskas', 'premier', 'golden',
    'petisco', 'ossinho', 'biscoito cachorro', 'areia de gato', 'areia sanitaria', 'pipicat',
    'tapete higienico', 'sache gato', 'sache cachorro', 'antipulgas', 'simparic', 'bravecto',
    'nexgard', 'shampoo pet', 'saquinho cata caca', 'coleira', 'brinquedo pet',
  ],
  outros: [],
};

// Constroi mapas de busca rapida uma unica vez na inicializacao
const EXACT_MAP = new Map<string, CategoryId>();
const ALL_SUGGESTIONS: Array<{ term: string; normalized: string; categoryId: CategoryId }> = [];

for (const [catId, words] of Object.entries(KEYWORD_GROUPS) as Array<[CategoryId, string[]]>) {
  for (const raw of words) {
    const norm = normalizeText(raw);
    if (!norm) continue;
    EXACT_MAP.set(norm, catId);
    ALL_SUGGESTIONS.push({
      term: raw.charAt(0).toUpperCase() + raw.slice(1),
      normalized: norm,
      categoryId: catId,
    });
  }
}

/**
 * Verifica se uma frase existe como palavra/expressão inteira dentro de outra string já normalizada.
 *
 * @param haystack - Texto completo normalizado.
 * @param needle - Termo normalizado a ser procurado nas fronteiras de palavra.
 * @returns `true` se o termo ocorrer isolado por início/fim da string ou espaços.
 */
export function hasWholePhrase(haystack: string, needle: string): boolean {
  let pos = haystack.indexOf(needle);
  while (pos !== -1) {
    const startOk = pos === 0 || haystack[pos - 1] === ' ';
    const endPos = pos + needle.length;
    const endOk = endPos === haystack.length || haystack[endPos] === ' ';
    if (startOk && endOk) return true;
    pos = haystack.indexOf(needle, pos + 1);
  }
  return false;
}

/**
 * Infere a categoria/corredor de um item consultando primeiro as preferências aprendidas do usuário
 * e em seguida o dicionário local PT-BR.
 *
 * @param itemName - Nome do item digitado ou colado.
 * @param userOverrides - Mapa opcional de categorias aprendidas pelo usuário.
 * @returns Identificador da categoria estimada, ou `'outros'` se desconhecido.
 */
export function guessCategory(
  itemName: string,
  userOverrides?: Map<string, CategoryId>
): CategoryId {
  const norm = normalizeText(itemName);
  if (!norm) return 'outros';

  if (userOverrides?.has(norm)) {
    return userOverrides.get(norm)!;
  }

  if (EXACT_MAP.has(norm)) {
    return EXACT_MAP.get(norm)!;
  }

  let bestMatch: { len: number; cat: CategoryId } | null = null;
  for (const [key, cat] of EXACT_MAP.entries()) {
    if (key.length >= 3 && hasWholePhrase(norm, key)) {
      if (!bestMatch || key.length > bestMatch.len) {
        bestMatch = { len: key.length, cat };
      }
    }
  }
  if (bestMatch) return bestMatch.cat;

  const tokens = norm.split(' ');
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (EXACT_MAP.has(token)) return EXACT_MAP.get(token)!;
    if (token.endsWith('s') && EXACT_MAP.has(token.slice(0, -1))) {
      return EXACT_MAP.get(token.slice(0, -1))!;
    }
  }

  return 'outros';
}

/**
 * Pesquisa termos no dicionário local PT-BR para alimentar o autocomplete em tempo real.
 *
 * @param query - Trecho digitado pelo usuário.
 * @param limit - Quantidade máxima de sugestões retornadas (padrão `6`).
 * @returns Lista priorizada por prefixo contendo termo formatado e categoria associada.
 */
export function searchDictionary(query: string, limit = 6): Array<{ term: string; categoryId: CategoryId }> {
  const norm = normalizeText(query);
  if (norm.length < 2) return [];

  const startsWith: Array<{ term: string; categoryId: CategoryId }> = [];
  const includes: Array<{ term: string; categoryId: CategoryId }> = [];

  for (const entry of ALL_SUGGESTIONS) {
    if (entry.normalized.startsWith(norm)) {
      startsWith.push({ term: entry.term, categoryId: entry.categoryId });
    } else if (entry.normalized.includes(norm)) {
      includes.push({ term: entry.term, categoryId: entry.categoryId });
    }
    if (startsWith.length >= limit) break;
  }

  return [...startsWith, ...includes].slice(0, limit);
}
