import { describe, expect, it } from 'vitest';
import { parsePackFromTitle } from '../../../shared/packParser';
import { formatBRL, formatCepMask } from '../formatters';
import { parseSingleItem } from '../itemParser';
import { computePriceComparison } from '../priceEngine';

describe('packParser, formatters, and parser regressions', () => {
  it('parses multipack product titles into total quantity', () => {
    expect(parsePackFromTitle('Cerveja Heineken 6x350ml')).toEqual({
      quantity: 2100,
      unit: 'ml',
    });
    expect(parsePackFromTitle('Iogurte Natural 12 x 170g')).toEqual({
      quantity: 2040,
      unit: 'g',
    });
    expect(parsePackFromTitle('Leite Integral 1 Litro')).toEqual({
      quantity: 1,
      unit: 'L',
    });
  });

  it('formats BRL currency and CEP mask consistently', () => {
    expect(formatBRL(1290)).toContain('12,90');
    expect(formatCepMask('01310100')).toBe('01310-100');
    expect(formatCepMask('013')).toBe('013');
  });

  it('extracts accented units (sachê, maço) and singular comprimido in itemParser', () => {
    expect(parseSingleItem('2 sachês gato')).toMatchObject({
      quantity: 2,
      unit: 'sachê',
    });
    expect(parseSingleItem('1 maço couve')).toMatchObject({
      quantity: 1,
      unit: 'maço',
    });
    expect(parseSingleItem('1 comprimido dipirona')).toMatchObject({
      quantity: 1,
      unit: 'comp',
    });
  });

  it('does not allow 1-2 character title tokens to prefix-match unrelated terms', () => {
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 86400_000).toISOString();
    const res = computePriceComparison({
      stores: [
        {
          id: 's1',
          name: 'Mercado Teste',
          chainSlug: 'chain-a',
          storeType: 'mercado',
          lat: -23.55,
          lng: -46.63,
          distanceKm: 1,
        },
      ],
      items: [
        {
          id: 'i1',
          listId: 'l1',
          name: 'Arroz',
          normalizedName: 'arroz',
          quantity: 1,
          unit: 'kg',
          categoryId: 'mercearia',
          isChecked: false,
          checkedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      candidates: [
        {
          storeId: null,
          chainSlug: 'chain-a',
          normalizedTerm: 'arroz',
          productKey: 'bad-match',
          productTitle: 'Biscoito Sabor A 100g',
          packQuantity: 100,
          packUnit: 'g',
          priceCents: 350,
          source: 'online',
          observedAt: now,
          expiresAt: expires,
        },
      ],
    });
    expect(res.rankedStores).toHaveLength(0);
  });
});
