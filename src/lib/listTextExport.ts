import type { CategoryDefinition, ShoppingItem } from '../types';
import { formatQuantity } from './itemParser';

/**
 * Formata os itens pendentes de uma lista agrupados por corredor em texto limpo
 * pronto para envio no WhatsApp ou área de transferência.
 *
 * @param listName - Nome da lista ativa.
 * @param groups - Grupos de itens pendentes ordenados por corredor.
 * @returns Texto formatado com cabeçalho, corredores em negrito e quantidades.
 */
export function formatPendingListForShare(
  listName: string,
  groups: Array<{ category: CategoryDefinition; items: ShoppingItem[] }>
): string {
  const nonEmpty = groups.filter((g) => g.items.length > 0);
  if (nonEmpty.length === 0) return '';

  const totalItems = nonEmpty.reduce((acc, g) => acc + g.items.length, 0);
  const lines: string[] = [`*${listName}* (${totalItems} ${totalItems === 1 ? 'item' : 'itens'})`, ''];

  for (const group of nonEmpty) {
    lines.push(`*${group.category.label}*`);
    for (const item of group.items) {
      const qty = formatQuantity(item.quantity, item.unit);
      lines.push(`- ${qty} ${item.name}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
