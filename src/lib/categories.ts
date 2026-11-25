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
