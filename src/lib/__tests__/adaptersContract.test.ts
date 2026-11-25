import { describe, expect, it } from 'vitest';
import { parseTausteProducts } from '../../../api/prices/_adapters/magentoAdapter';
import { parseOccProducts } from '../../../api/prices/_adapters/occAdapter';
import { parseJauServeHtml } from '../../../api/prices/_adapters/sfccAdapter';
import { parseVtexProducts } from '../../../api/prices/_adapters/vtexAdapter';

const NOW = '2026-11-24T21:00:00.000Z';
const EXPIRES = '2026-11-25T21:00:00.000Z';

describe('Contract parsers dos adaptadores de varejo', () => {
  it('parseVtexProducts extrai preço, estoque e embalagem', () => {
    const sample = [
      {
        productId: '100',
        productName: 'Carne Moída de Patinho Swift 1kg',
        brand: 'Swift',
        categories: ['/Açougue/Bovinos/'],
        items: [
          {
            ean: '7891234567890',
            sellers: [{ commertialOffer: { Price: 54.9, AvailableQuantity: 10 } }],
          },
        ],
      },
      {
        productId: '101',
        productName: 'Item Esgotado 1kg',
        items: [{ sellers: [{ commertialOffer: { Price: 10, AvailableQuantity: 0 } }] }],
      },
    ];

    const res = parseVtexProducts(sample, 'swift', 'patinho', NOW, EXPIRES);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      chainSlug: 'swift',
      priceCents: 5490,
      packQuantity: 1,
      packUnit: 'kg',
      brand: 'Swift',
      ean: '7891234567890',
      retailCategory: '/Açougue/Bovinos/',
    });
  });

  it('parseOccProducts extrai preço e marca do Confiança OCC', () => {
    const sample = {
      resultsList: {
        records: [
          {
            records: [
              {
                attributes: {
                  'product.displayName': ['Leite Longa Vida Integral Jussara 1 Litro'],
                  'sku.activePrice': ['4.980000'],
                  'product.brand': ['JUSSARA'],
                  'product.repositoryId': ['227250'],
                  'product.category': ['Laticínios'],
                },
              },
            ],
          },
        ],
      },
    };

    const res = parseOccProducts(sample, 'confianca', 'leite integral', NOW, EXPIRES);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      chainSlug: 'confianca',
      priceCents: 498,
      packQuantity: 1,
      packUnit: 'L',
      brand: 'JUSSARA',
      retailCategory: 'Laticínios',
    });
  });

  it('parseTausteProducts extrai preço do GraphQL Magento 2', () => {
    const sample = {
      data: {
        products: {
          items: [
            {
              name: 'Leite UHT Integral Parmalat 1L',
              sku: '119162',
              categories: [{ name: 'Mercearia' }, null, { name: 'Leites' }],
              price_range: { minimum_price: { final_price: { value: 5.49 } } },
            },
          ],
        },
      },
    };

    const res = parseTausteProducts(sample, 'leite integral', NOW, EXPIRES);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      chainSlug: 'tauste',
      priceCents: 549,
      packQuantity: 1,
      packUnit: 'L',
      retailCategory: 'Mercearia / Leites',
    });
  });

  it('parseJauServeHtml extrai produtos e preços do HTML SFCC (incluindo blocos maiores)', () => {
    const padding = '<div>'.repeat(200) + '</div>'.repeat(200);
    const html = `
      <div class="product" data-pid="12345">
        <img alt="Leite UHT Integral H&eacute;rcules Caixa 1l" />
        ${padding}
        <span class="value">R$ 4,98</span>
      </div>
    `;

    const res = parseJauServeHtml(html, 'leite integral', NOW, EXPIRES);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      chainSlug: 'jauserve',
      productTitle: 'Leite UHT Integral Hércules Caixa 1l',
      priceCents: 498,
      packQuantity: 1,
      packUnit: 'L',
    });
  });
});
