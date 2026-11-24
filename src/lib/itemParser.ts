import type { ParsedItemInput } from '../types';
import { normalizeText } from './dictionaryPtBr';

const UNIT_ALIASES: Record<string, string> = {
  un: 'un',
  und: 'un',
  unid: 'un',
  unidade: 'un',
  unidades: 'un',
  x: 'un',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  g: 'g',
  gr: 'g',
  grama: 'g',
  gramas: 'g',
  l: 'L',
  lt: 'L',
  litro: 'L',
  litros: 'L',
  ml: 'ml',
  cx: 'cx',
  cxs: 'cx',
  caixa: 'cx',
  caixas: 'cx',
  pct: 'pct',
  pcte: 'pct',
  pacote: 'pct',
  pacotes: 'pct',
  fd: 'fd',
  fardo: 'fd',
  fardos: 'fd',
  dz: 'dz',
  duzia: 'dz',
  dúzia: 'dz',
  duzias: 'dz',
  dúzias: 'dz',
  lata: 'lata',
  latas: 'lata',
  ltas: 'lata',
  garrafa: 'gf',
  garrafas: 'gf',
  gf: 'gf',
  frasco: 'fr',
  frascos: 'fr',
  fr: 'fr',
  tubo: 'tubo',
  tubos: 'tubo',
  cartela: 'cart',
  cartelas: 'cart',
  comp: 'comp',
  comprimidos: 'comp',
  rolo: 'rolo',
  rolos: 'rolo',
  sache: 'sachê',
  saches: 'sachê',
  pote: 'pote',
  potes: 'pote',
  bandeja: 'bdj',
  bandejas: 'bdj',
  bdj: 'bdj',
  maco: 'maço',
  macos: 'maço',
};

const UNIT_PATTERN = Object.keys(UNIT_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join('|');

// Guard against leading pharmacy dosages (e.g. "500mg dipirona") and known numeric-leading brands ("3 Corações", "7 Belo", "3M")
const LEADING_DOSAGE_REGEX = /^\d+(?:[.,]\d+)?\s*(?:mg|mcg|ui|%)\b/i;
const LEADING_BRAND_REGEX = /^(?:3\s+cora[çc][õo]es|7\s+belo|3m|51\s+ice|51\s+cacha[çc]a)\b/i;
const LEADING_QTY_REGEX = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(?:(${UNIT_PATTERN})\\b)?\\s*(?:de\\s+)?(.+)$`,
  'i'
);
const TRAILING_QTY_UNIT_REGEX = new RegExp(
  `^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})$`,
  'i'
);
const TRAILING_X_REGEX = /^(.+?)\s+[xX]\s*(\d+(?:[.,]\d+)?)$/;
const TRAILING_PLAIN_NUMBER_REGEX = /^(.+?)\s+(\d+(?:[.,]\d+)?)$/;
// Protect product specs like "Fralda tamanho 3", "Ômega 3", "FPS 50", "Vitamina B12", "Café tipo 1"
const TRAILING_SPEC_PREFIX_REGEX =
  /(?:tamanho|tam\.?|n[º°]?|tipo|fase|etapa|[ôo]mega|fps|fator|vol\.?|vitamina\s*[a-z]?|grau|passo)$/i;

/**
 * Converte uma string numérica com ponto ou vírgula em número positivo válido.
 *
 * @param raw - Texto numérico bruto (ex.: `"1,5"` ou `"2"`).
 * @returns Número positivo convertido, ou `1` como valor seguro padrão.
 */
function parseNumber(raw: string): number {
  const num = Number(raw.replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : 1;
}

/**
 * Capitaliza a primeira letra de uma string removendo espaços extras nas bordas.
 *
 * @param text - Texto de entrada.
 * @returns Texto com a primeira letra em maiúscula.
 */
function capitalizeFirst(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Remove marcadores de lista, checkboxes e numeração inicial comuns em mensagens do WhatsApp.
 *
 * @param line - Linha bruta copiada ou digitada.
 * @returns Linha limpa sem prefixos decorativos.
 */
function stripBulletPrefix(line: string): string {
  return line
    .trim()
    .replace(/^(\[[\sxX✓✔]?\]\s*)/, '')
    .replace(/^(?:(?:[-*•▪▫]|✅|☑️|🔹|🔸|👉)\s*)+/u, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();
}

/**
 * Analisa uma única linha de texto e extrai nome, quantidade e unidade de medida.
 *
 * @remarks
 * Suporta quantidades iniciais (`"2 leite integral"`, `"1,5kg batata"`),
 * quantidades finais (`"dipirona 500mg 2 cx"`, `"pão x2"`) e preserva dosagens iniciais (`"500mg dipirona"`).
 *
 * @param rawLine - Texto bruto de um item.
 * @returns Objeto estruturado {@link ParsedItemInput} ou `null` se a linha estiver vazia.
 */
export function parseSingleItem(rawLine: string): ParsedItemInput | null {
  const line = stripBulletPrefix(rawLine);
  if (!line) return null;

  let quantity = 1;
  let unit = 'un';
  let name = line;

  const leadingMatch =
    LEADING_DOSAGE_REGEX.test(line) || LEADING_BRAND_REGEX.test(line)
      ? null
      : line.match(LEADING_QTY_REGEX);

  if (leadingMatch) {
    const [, rawQty, rawUnit, rest] = leadingMatch;
    const cleanedRest = rest.trim();
    const numericCandidate = Number(rawQty.replace(',', '.'));
    // Avoid misinterpreting "0 leite" as valid quantity or empty rest
    if (cleanedRest.length >= 2) {
      quantity = Number.isFinite(numericCandidate) && numericCandidate > 0 ? numericCandidate : 1;
      if (rawUnit && numericCandidate > 0) {
        unit = UNIT_ALIASES[rawUnit.toLowerCase()] ?? 'un';
      }
      name = cleanedRest;
    }
  } else {
    // 2. Trailing quantity + unit: "dipirona 500mg 2 cx", "queijo prato 300g", "leite 3x", "papel higienico 2 pct"
    const m1 = line.match(TRAILING_QTY_UNIT_REGEX);
    const m2 = !m1 ? line.match(TRAILING_X_REGEX) : null;
    const m3 = !m1 && !m2 ? line.match(TRAILING_PLAIN_NUMBER_REGEX) : null;

    if (m1 && m1[1].trim().length >= 2) {
      name = m1[1].trim();
      quantity = parseNumber(m1[2]);
      unit = UNIT_ALIASES[m1[3].toLowerCase()] ?? 'un';
    } else if (m2 && m2[1].trim().length >= 2) {
      name = m2[1].trim();
      quantity = parseNumber(m2[2]);
      unit = 'un';
    } else if (m3 && m3[1].trim().length >= 2 && !TRAILING_SPEC_PREFIX_REGEX.test(m3[1].trim())) {
      // Only treat trailing plain number as quantity if positive and <= 50
      const rawCandidate = Number(m3[2].replace(',', '.'));
      if (Number.isFinite(rawCandidate) && rawCandidate > 0 && rawCandidate <= 50) {
        name = m3[1].trim();
        quantity = rawCandidate;
        unit = 'un';
      }
    }
  }

  name = capitalizeFirst(name.replace(/\s+/g, ' '));
  const normalizedName = normalizeText(name);
  if (!normalizedName) return null;

  return {
    name,
    normalizedName,
    quantity,
    unit,
  };
}

/**
 * Divide um texto com múltiplas linhas ou separado por ponto-e-vírgula (ex.: lista do WhatsApp) em itens estruturados.
 *
 * @param rawText - Texto completo colado ou ditado.
 * @returns Lista de itens analisados, ignorando cabeçalhos genéricos como `"Lista de compras:"`.
 */
export function parseMultiLineInput(rawText: string): ParsedItemInput[] {
  const lines = rawText
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: ParsedItemInput[] = [];
  for (const line of lines) {
    if (/^(lista(\s+de\s+compras)?|mercado|farm[aá]cia|compras)\s*:?$/i.test(line)) {
      continue;
    }
    const item = parseSingleItem(line);
    if (item) {
      parsed.push(item);
    }
  }
  return parsed;
}

/**
 * Formata quantidade e unidade para exibição compacta na interface (ex.: `2x`, `1,5kg`, `3 cx`).
 *
 * @param quantity - Valor numérico da quantidade.
 * @param unit - Unidade de medida padronizada.
 * @returns Representação textual amigável em português.
 */
export function formatQuantity(quantity: number, unit: string): string {
  const formattedQty = Number.isInteger(quantity)
    ? String(quantity)
    : String(quantity).replace('.', ',');

  if (unit === 'un') {
    return `${formattedQty}x`;
  }
  if (unit === 'g' || unit === 'kg' || unit === 'ml' || unit === 'L') {
    return `${formattedQty}${unit}`;
  }
  return `${formattedQty} ${unit}`;
}
