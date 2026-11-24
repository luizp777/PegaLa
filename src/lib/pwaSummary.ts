import type { ShoppingItem } from '../types';
import { formatQuantity } from './itemParser';

/**
 * Monta um resumo textual limpo dos itens comprados na lista para compartilhamento via WhatsApp ou Web Share API.
 *
 * @param listName - Nome visível da lista concluída.
 * @param checkedItems - Lista de itens marcados como pegos.
 * @returns Texto formatado pronto para compartilhamento.
 */
export function buildShoppingSummaryText(listName: string, checkedItems: ShoppingItem[]): string {
  const aisleCount = new Set(checkedItems.map((i) => i.categoryId)).size;
  const itemLabel = checkedItems.length === 1 ? 'item' : 'itens';
  const aisleLabel = aisleCount === 1 ? 'corredor' : 'corredores';

  const header = `Compra concluída — ${listName} (${checkedItems.length} ${itemLabel} em ${aisleCount} ${aisleLabel}):`;
  const lines = checkedItems.map(
    (item) => `• ${item.name} (${formatQuantity(item.quantity, item.unit)})`
  );

  return [header, ...lines].join('\n');
}
