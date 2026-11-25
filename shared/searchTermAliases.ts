/**
 * Regras de tradução entre termos do catálogo do app (como o usuário escreve na lista)
 * e termos que os e-commerces brasileiros realmente usam nos títulos dos produtos.
 */
export interface SearchTermAliasRule {
  /** Query enviada às APIs dos varejistas em vez do termo literal. */
  searchQuery: string;
  /** Termos alternativos aceitos no matching textual do motor de preços. */
  matchTerms: string[];
  /** Palavras que invalidam o candidato quando o usuário pediu este termo específico. */
  forbiddenInTitle?: string[];
}

export const SEARCH_TERM_ALIASES: Record<string, SearchTermAliasRule> = {
  // Hortifruti
  'batata inglesa': {
    searchQuery: 'batata lavada',
    matchTerms: ['batata inglesa', 'batata lavada', 'batata monalisa', 'batata asterix', 'batata'],
    forbiddenInTitle: ['doce', 'baroa', 'yacon', 'palha', 'frita', 'congelada', 'salgadinho', 'chips', 'ruffles', 'pringles', 'lays', 'sopa', 'pure'],
  },
  'cheiro verde': {
    searchQuery: 'cheiro verde',
    matchTerms: ['cheiro verde', 'salsa cebolinha', 'salsinha cebolinha'],
  },

  // Padaria & Matinais
  'cafe moido': {
    searchQuery: 'cafe torrado moido',
    matchTerms: ['cafe moido', 'cafe'],
    forbiddenInTitle: ['capsula', 'capsulas', 'soluvel', 'cappuccino', 'capuccino', 'em grao', 'em graos'],
  },
  'cafe em capsula': {
    searchQuery: 'capsula cafe',
    matchTerms: ['cafe em capsula', 'capsula cafe', 'capsulas cafe'],
  },
  'biscoito doce': {
    searchQuery: 'biscoito maizena',
    matchTerms: ['biscoito doce', 'biscoito maizena', 'biscoito maria', 'biscoito leite', 'biscoito recheado', 'biscoito'],
    forbiddenInTitle: ['salgado', 'agua e sal', 'cream cracker', 'polvilho', 'cachorro', 'cao', 'caes', 'pet'],
  },

  // Laticínios & Frios
  'queijo mussarela': {
    searchQuery: 'queijo mussarela',
    matchTerms: ['queijo mussarela', 'queijo mucarela', 'mussarela', 'mucarela'],
    forbiddenInTitle: ['pao de queijo', 'salgadinho', 'biscoito', 'pizza', 'lasanha', 'pastel'],
  },
  'leite de aveia': {
    searchQuery: 'bebida aveia',
    matchTerms: ['leite de aveia', 'bebida aveia', 'bebida vegetal aveia'],
  },
  'leite de amendoas': {
    searchQuery: 'bebida amendoas',
    matchTerms: ['leite de amendoas', 'bebida amendoas', 'bebida vegetal amendoas'],
  },

  // Açougue & Peixaria
  'costela bovina': {
    searchQuery: 'costela bovina',
    matchTerms: ['costela bovina', 'costela'],
    forbiddenInTitle: ['suina', 'suino', 'porco', 'caldo', 'tempero', 'miojo', 'salgadinho'],
  },
  'atum em lata': {
    searchQuery: 'atum',
    matchTerms: ['atum em lata', 'atum'],
    forbiddenInTitle: ['pate', 'racao', 'gato', 'sache'],
  },
  'sardinha em lata': {
    searchQuery: 'sardinha',
    matchTerms: ['sardinha em lata', 'sardinha'],
    forbiddenInTitle: ['pate', 'racao', 'gato', 'sache'],
  },

  // Mercearia
  'arroz branco': {
    searchQuery: 'arroz tipo 1',
    matchTerms: ['arroz branco', 'arroz'],
    forbiddenInTitle: ['integral', 'parboilizado', 'arboreo', 'negro', 'jasmim', 'cateto', 'selvagem'],
  },
  'macarrao espaguete': {
    searchQuery: 'macarrao espaguete',
    matchTerms: ['macarrao espaguete', 'massa espaguete', 'espaguete'],
    forbiddenInTitle: ['molho', 'instantaneo', 'miojo'],
  },
  'macarrao penne': {
    searchQuery: 'macarrao penne',
    matchTerms: ['macarrao penne', 'massa penne', 'penne'],
    forbiddenInTitle: ['molho', 'prato pronto', 'congelado'],
  },
  'macarrao parafuso': {
    searchQuery: 'macarrao parafuso',
    matchTerms: ['macarrao parafuso', 'massa parafuso', 'parafuso', 'fusilli'],
    forbiddenInTitle: ['molho', 'ferramenta'],
  },
  'sal refinado': {
    searchQuery: 'sal refinado',
    matchTerms: ['sal refinado', 'sal iodado', 'sal'],
    forbiddenInTitle: ['grosso', 'parrilla', 'rosa', 'himalaia', 'marinho', 'temperado', 'salgadinho', 'biscoito', 'bolacha', 'agua e sal', 'fruta', 'frutas'],
  },
  'oleo de soja': {
    searchQuery: 'oleo de soja',
    matchTerms: ['oleo de soja', 'oleo soja', 'oleo'],
    forbiddenInTitle: ['azeite', 'oliva', 'girassol', 'milho', 'canola', 'coco', 'corporal', 'cabelo', 'capilar', 'bebe', 'motor', 'peroba', 'essencial'],
  },
  'milho em conserva': {
    searchQuery: 'milho verde',
    matchTerms: ['milho em conserva', 'milho verde', 'milho'],
    forbiddenInTitle: ['pipoca', 'fuba', 'farinha', 'amido', 'flocao', 'oleo', 'salgadinho'],
  },

  // Congelados (títulos de varejo raramente incluem a palavra "congelado(a)")
  'pizza congelada': {
    searchQuery: 'pizza',
    matchTerms: ['pizza congelada', 'pizza'],
    forbiddenInTitle: ['massa', 'molho', 'tempero', 'salgadinho', 'biscoito', 'cortador', 'forma'],
  },
  'batata frita congelada': {
    searchQuery: 'batata pre frita',
    matchTerms: ['batata frita congelada', 'batata pre frita', 'batata palito', 'batata congelada'],
    forbiddenInTitle: ['palha', 'chips', 'ruffles', 'pringles', 'lays', 'salgadinho'],
  },
  'lasanha congelada': {
    searchQuery: 'lasanha',
    matchTerms: ['lasanha congelada', 'lasanha'],
    forbiddenInTitle: ['massa', 'molho', 'tempero', 'travessa'],
  },
  'hamburguer congelado': {
    searchQuery: 'hamburguer',
    matchTerms: ['hamburguer congelado', 'hamburguer'],
    forbiddenInTitle: ['pao', 'molho', 'tempero', 'maionese', 'ketchup'],
  },
  'legumes congelados': {
    searchQuery: 'legumes congelados',
    matchTerms: ['legumes congelados', 'seleta legumes', 'mix legumes', 'jardineira legumes'],
  },

  // Bebidas
  'refrigerante cola': {
    searchQuery: 'refrigerante coca cola',
    matchTerms: ['refrigerante cola', 'coca cola', 'pepsi'],
    forbiddenInTitle: ['bala', 'chiclete', 'sorvete', 'picole'],
  },
  'refrigerante limao': {
    searchQuery: 'refrigerante limao',
    matchTerms: ['refrigerante limao', 'sprite', 'soda limonada', 'fanta limao', 'h2oh limao'],
  },
  'cha gelado': {
    searchQuery: 'cha pronto',
    matchTerms: ['cha gelado', 'cha pronto', 'ice tea', 'matte leao', 'cha mate'],
    forbiddenInTitle: ['sache', 'saquinho', 'caixinha', 'capsula'],
  },

  // Limpeza & Utilidades
  'esponja de louca': {
    searchQuery: 'esponja multiuso',
    matchTerms: ['esponja de louca', 'esponja multiuso', 'esponja dupla face', 'esponja'],
    forbiddenInTitle: ['banho', 'maquiagem', 'aco'],
  },
  'palha de aco': {
    searchQuery: 'la de aco',
    matchTerms: ['palha de aco', 'la de aco', 'esponja de aco', 'bombril'],
  },
  'luva de limpeza': {
    searchQuery: 'luva latex',
    matchTerms: ['luva de limpeza', 'luva latex', 'luva multiuso', 'luva forrada'],
    forbiddenInTitle: ['procedimento', 'cirurgica', 'boxe'],
  },
  'super cola': {
    searchQuery: 'cola instantanea',
    matchTerms: ['super cola', 'cola instantanea', 'super bonder', 'adesivo instantaneo'],
  },

  // Higiene & Primeiros Socorros
  'pasta de dente': {
    searchQuery: 'creme dental',
    matchTerms: ['pasta de dente', 'creme dental', 'gel dental'],
  },
  'sabonete em barra': {
    searchQuery: 'sabonete barra',
    matchTerms: ['sabonete em barra', 'sabonete'],
    forbiddenInTitle: ['liquido', 'intimo', 'facial', 'refil', 'espuma'],
  },
  'desodorante aerosol': {
    searchQuery: 'desodorante aerossol',
    matchTerms: ['desodorante aerosol', 'desodorante aerossol'],
  },
  cotonete: {
    searchQuery: 'hastes flexiveis',
    matchTerms: ['cotonete', 'hastes flexiveis'],
  },
  'band aid': {
    searchQuery: 'curativo band aid',
    matchTerms: ['band aid', 'curativo adesivo', 'curativo'],
  },

  // Bebê
  'pomada de assadura': {
    searchQuery: 'creme assaduras',
    matchTerms: ['pomada de assadura', 'pomada assadura', 'creme assadura', 'creme preventivo assadura'],
  },
  'lenco umedecido bebe': {
    searchQuery: 'lenco umedecido',
    matchTerms: ['lenco umedecido bebe', 'lenco umedecido', 'toalha umedecida'],
    forbiddenInTitle: ['demaquilante', 'limpeza', 'desinfetante', 'pet', 'cao', 'gato'],
  },

  // Pet (varejistas usam "cães" em vez de "cachorro")
  'racao cachorro': {
    searchQuery: 'racao caes',
    matchTerms: ['racao cachorro', 'racao caes', 'racao cao'],
    forbiddenInTitle: ['gato', 'gatos', 'felino'],
  },
  'sache cachorro': {
    searchQuery: 'sache caes',
    matchTerms: ['sache cachorro', 'sache caes', 'sache cao'],
    forbiddenInTitle: ['gato', 'gatos', 'felino'],
  },
  'petisco cachorro': {
    searchQuery: 'petisco caes',
    matchTerms: ['petisco cachorro', 'petisco caes', 'biscoito caes'],
    forbiddenInTitle: ['gato', 'gatos', 'felino'],
  },
  'saquinho cata caca': {
    searchQuery: 'saco higienico pet',
    matchTerms: ['saquinho cata caca', 'cata caca', 'saco higienico'],
  },
};

/**
 * Resolve a query mais eficaz para enviar às APIs de busca dos varejistas.
 */
export function resolveRetailSearchQuery(normalizedTerm: string): string {
  const key = normalizedTerm
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SEARCH_TERM_ALIASES[key]?.searchQuery ?? key;
}
