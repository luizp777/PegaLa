// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShoppingItem } from '../../types';
import { PriceComparisonSheet } from '../PriceComparisonSheet';

afterEach(() => {
  cleanup();
});

const mockSearchByCep = vi.fn().mockResolvedValue(undefined);
const mockRequestGps = vi.fn().mockResolvedValue(undefined);
const mockReportPrice = vi.fn().mockResolvedValue({ ok: true });
const mockSelectPref = vi.fn().mockResolvedValue(undefined);

const item1: ShoppingItem = {
  id: 'i1',
  listId: 'l1',
  name: 'Leite integral',
  normalizedName: 'leite integral',
  quantity: 2,
  unit: 'L',
  categoryId: 'laticinios',
  isChecked: false,
  checkedAt: null,
  createdAt: '2026-11-24T00:00:00.000Z',
  updatedAt: '2026-11-24T00:00:00.000Z',
};

vi.mock('../../hooks/usePriceComparison', () => ({
  usePriceComparison: () => ({
    location: { cep: '01310100', label: 'Bela Vista, São Paulo', radiusKm: 3 },
    stores: [
      { id: 's1', name: 'Mambo', chainSlug: 'mambo', storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.4 },
    ],
    result: {
      totalItems: 1,
      emptyStores: [
        { id: 's2', name: 'Mercadinho Local', chainSlug: null, storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.2 },
      ],
      bestSplit: null,
      rankedStores: [
        {
          store: { id: 's1', name: 'Mambo', chainSlug: 'mambo', storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.4 },
          matchedCount: 1,
          totalItems: 1,
          coverageRatio: 1,
          matchedTotalCents: 996,
          estimatedFullTotalCents: 996,
          comparableTotalCents: null,
          hasEstimatedMissing: false,
          savingsVsSecondCents: 182,
          missingItems: [],
          matchedItems: [
            {
              item: item1,
              packsNeeded: 2,
              effectiveTotalCents: 996,
              isApproximateUnit: false,
              isPreferred: false,
              source: 'online',
              observedAt: new Date().toISOString(),
              candidate: {
                storeId: null,
                chainSlug: 'mambo',
                normalizedTerm: 'leite integral',
                productKey: 'leite-1',
                productTitle: 'Leite Integral Jussara 1L',
                packQuantity: 1,
                packUnit: 'L',
                priceCents: 498,
                source: 'online',
                observedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 86400_000).toISOString(),
              },
              alternatives: [
                {
                  storeId: null,
                  chainSlug: 'mambo',
                  normalizedTerm: 'leite integral',
                  productKey: 'leite-1',
                  productTitle: 'Leite Integral Jussara 1L',
                  packQuantity: 1,
                  packUnit: 'L',
                  priceCents: 498,
                  source: 'online',
                  observedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
                },
                {
                  storeId: null,
                  chainSlug: 'mambo',
                  normalizedTerm: 'leite integral',
                  productKey: 'leite-2',
                  productTitle: 'Leite Integral Piracanjuba 1L',
                  packQuantity: 1,
                  packUnit: 'L',
                  priceCents: 549,
                  source: 'online',
                  observedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
                },
              ],
            },
          ],
        },
      ],
    },
    isLoadingStores: false,
    isStreamingQuotes: false,
    streamProgress: { done: 1, total: 1 },
    failedChains: [],
    error: null,
    isOfflineCache: false,
    cachedAt: null,
    includeChecked: false,
    setIncludeChecked: vi.fn(),
    requestGpsAndCompare: mockRequestGps,
    searchByCepAndCompare: mockSearchByCep,
    changeRadius: vi.fn(),
    refreshComparison: vi.fn(),
    selectPreferredProduct: mockSelectPref,
    reportManualPrice: mockReportPrice,
  }),
}));

describe('PriceComparisonSheet', () => {
  it('renderiza vencedora, troca de marca e envio de preço manual', async () => {
    const onShowToast = vi.fn();
    render(
      <PriceComparisonSheet
        open={true}
        listId="l1"
        listName="Mercado"
        listType="mercado"
        pendingItems={[item1]}
        checkedItems={[]}
        onClose={vi.fn()}
        onShowToast={onShowToast}
      />
    );

    expect(screen.getByText(/Comparar preços • Mercado/)).toBeInTheDocument();
    expect(screen.getByText('Mais barata')).toBeInTheDocument();
    expect(screen.getByText(/Leite Integral Jussara 1L/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Trocar marca'));
    expect(screen.getByText('Leite Integral Piracanjuba 1L')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Leite Integral Piracanjuba 1L'));
    expect(mockSelectPref).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Ajustar'));
    const priceInput = screen.getByLabelText('Preço em reais');
    fireEvent.change(priceInput, { target: { value: '5,29' } });
    fireEvent.click(screen.getByText('Salvar preço'));

    expect(mockReportPrice).toHaveBeenCalled();
  });

  it('permite recolher o card #1 e ativar Estou comprando aqui', () => {
    const onSelectStore = vi.fn();
    render(
      <PriceComparisonSheet
        open={true}
        listId="l1"
        listName="Mercado"
        listType="mercado"
        pendingItems={[item1]}
        checkedItems={[]}
        activeShoppingStore={null}
        onSelectShoppingStore={onSelectStore}
        onClose={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Estou comprando aqui'));
    expect(onSelectStore).toHaveBeenCalledWith({ id: 's1', name: 'Mambo' });

    fireEvent.click(screen.getByText('Mambo'));
    expect(screen.queryByText('Trocar marca')).not.toBeInTheDocument();
  });

  it('alterna para aba Dividir em 2 lojas', () => {
    render(
      <PriceComparisonSheet
        open={true}
        listId="l1"
        listName="Mercado"
        listType="mercado"
        pendingItems={[item1]}
        checkedItems={[]}
        onClose={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Dividir em 2 lojas'));
    expect(screen.getByText(/Dividir a compra em duas lojas não gera economia relevante/)).toBeInTheDocument();
  });
});
