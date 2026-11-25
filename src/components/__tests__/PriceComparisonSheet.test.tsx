// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShoppingItem } from '../../types';
import { PinnedStoreBar } from '../PinnedStoreBar';
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
      { id: '11111111-1111-4111-8111-111111111111', name: 'Mambo', chainSlug: 'mambo', storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.4 },
    ],
    result: {
      totalItems: 1,
      emptyStores: [
        { id: '22222222-2222-4222-8222-222222222222', name: 'Mercadinho Local', chainSlug: null, storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.2 },
      ],
      bestSplit: null,
      rankedStores: [
        {
          store: { id: '11111111-1111-4111-8111-111111111111', name: 'Mambo', chainSlug: 'mambo', storeType: 'mercado', lat: -23.5, lng: -46.6, distanceKm: 0.4 },
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

  it('permite recolher o card #1 e fixar estabelecimento com Escolher esta loja', () => {
    const onSelectStore = vi.fn();
    const onClose = vi.fn();
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
        onClose={onClose}
        onShowToast={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Escolher esta loja'));
    expect(onSelectStore).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Mambo',
        lat: -23.5,
        lng: -46.6,
        fallbackTotalCents: 996,
      })
    );
    expect(onClose).toHaveBeenCalled();

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

describe('PinnedStoreBar', () => {
  it('exibe total estimado, subtotal no carrinho, link Leve-me lá e ações', () => {
    const onOpenComparator = vi.fn();
    const onUnpin = vi.fn();
    render(
      <PinnedStoreBar
        store={{
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Confiança Max',
          chainSlug: 'confianca',
          lat: -22.3245,
          lng: -49.0712,
          distanceKm: 2.79,
          fallbackTotalCents: 1054,
          fallbackMatchedCount: 2,
          fallbackTotalItems: 2,
          pinnedAt: '2026-11-24T23:00:00.000Z',
        }}
        summary={{
          estimatedTotalCents: 1054,
          inCartTotalCents: 420,
          matchedCount: 2,
          totalItems: 2,
          hasEstimatedMissing: false,
        }}
        onOpenComparator={onOpenComparator}
        onUnpin={onUnpin}
      />
    );

    expect(screen.getByText('Confiança Max')).toBeInTheDocument();
    expect(screen.getAllByText(/10,54/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No carrinho:/).length).toBeGreaterThan(0);

    const navLink = screen.getByRole('link', { name: /Leve-me lá/i });
    expect(navLink).toHaveAttribute('href', expect.stringContaining('-22.3245,-49.0712'));

    fireEvent.click(screen.getByLabelText('Trocar estabelecimento'));
    expect(onOpenComparator).toHaveBeenCalled();

    fireEvent.click(screen.getAllByLabelText('Desafixar estabelecimento')[0]);
    expect(onUnpin).toHaveBeenCalled();
  });
});
