/**
 * Resultado da extração de embalagem (quantidade e unidade) a partir do título de um produto.
 */
export interface ParsedPack {
  quantity: number;
  unit: string;
}

/**
 * Extrai quantidade e unidade de embalagem a partir do título de um produto do varejo.
 * Compartilhado entre frontend (`priceEngine`) e backend (`_adapters`).
 *
 * @param title - Título completo do produto (ex.: `"Arroz Tio João 5kg"`).
 * @param fallbackQty - Quantidade padrão quando não encontrada no título.
 * @param fallbackUnit - Unidade padrão quando não encontrada no título.
 * @returns Quantidade e unidade normalizadas.
 */
export function parsePackFromTitle(
  title: string,
  fallbackQty = 1,
  fallbackUnit = 'un'
): ParsedPack {
  const norm = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const match = norm.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l|lt|litro|litros|un|und)\b/);
  if (match) {
    const qty = Number(match[1].replace(',', '.'));
    let unit = match[2];
    if (unit === 'gr') unit = 'g';
    if (unit === 'lt' || unit === 'litro' || unit === 'litros' || unit === 'l') unit = 'L';
    if (unit === 'und') unit = 'un';
    if (Number.isFinite(qty) && qty > 0) {
      return { quantity: qty, unit };
    }
  }
  return {
    quantity: fallbackQty > 0 ? fallbackQty : 1,
    unit: fallbackUnit || 'un',
  };
}
