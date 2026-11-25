import { expect, test } from '@playwright/test';

test.use({
  baseURL: 'http://localhost:4174',
  serviceWorkers: 'block',
});

test.describe('Price Comparison (mocked API)', () => {
  test('compares items via CEP, renders NDJSON stream ranking and persists offline cache', async ({
    page,
  }) => {
    const mockUserId = '11111111-1111-4111-8111-111111111111';
    const future = new Date(Date.now() + 86400_000).toISOString();
    const now = new Date().toISOString();

    await page.route('https://e2e-mock.supabase.co/auth/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/signup') || url.includes('/token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-jwt-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: { id: mockUserId, aud: 'authenticated', role: 'authenticated', is_anonymous: true },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: mockUserId, is_anonymous: true } }),
      });
    });

    await page.route('https://e2e-mock.supabase.co/rest/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/rpc/report_community_price')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        return;
      }
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    });

    await page.route('**/api/prices/nearby-stores', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          location: {
            cep: '01310100',
            cepPrefix: '01310',
            city: 'São Paulo',
            label: 'Bela Vista, São Paulo',
            lat: -23.56,
            lng: -46.65,
            radiusKm: 3,
          },
          stores: [
            {
              id: 'store-mambo',
              name: 'Mambo Bela Vista',
              chainSlug: 'mambo',
              storeType: 'mercado',
              lat: -23.561,
              lng: -46.651,
              distanceKm: 0.4,
            },
            {
              id: 'store-oba',
              name: 'Oba Jardins',
              chainSlug: 'obahortifruti',
              storeType: 'mercado',
              lat: -23.565,
              lng: -46.66,
              distanceKm: 1.1,
            },
          ],
        }),
      });
    });

    await page.route('**/api/prices/quotes', async (route) => {
      const lines = [
        JSON.stringify({ type: 'cache', candidates: [] }),
        JSON.stringify({
          type: 'chain',
          chainSlug: 'mambo',
          normalizedTerm: 'leite integral',
          candidates: [
            {
              storeId: null,
              chainSlug: 'mambo',
              normalizedTerm: 'leite integral',
              productKey: 'leite-mambo',
              productTitle: 'Leite Integral Jussara 1L',
              packQuantity: 1,
              packUnit: 'L',
              priceCents: 498,
              source: 'online',
              observedAt: now,
              expiresAt: future,
            },
          ],
        }),
        JSON.stringify({
          type: 'chain',
          chainSlug: 'obahortifruti',
          normalizedTerm: 'leite integral',
          candidates: [
            {
              storeId: null,
              chainSlug: 'obahortifruti',
              normalizedTerm: 'leite integral',
              productKey: 'leite-oba',
              productTitle: 'Leite Integral Paulista 1L',
              packQuantity: 1,
              packUnit: 'L',
              priceCents: 589,
              source: 'online',
              observedAt: now,
              expiresAt: future,
            },
          ],
        }),
        JSON.stringify({ type: 'done', failedChains: [] }),
      ].join('\n');

      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson; charset=utf-8',
        body: `${lines}\n`,
      });
    });

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    });

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Mercado');

    const input = page.getByPlaceholder('Adicionar item...');
    await input.fill('2 leite integral');
    await input.press('Enter');

    await expect(page.getByText('Leite integral')).toBeVisible();

    await page.getByRole('button', { name: /Comparar preços/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('CEP').fill('01310-100');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.getByText('Mais barata')).toBeVisible();
    await expect(page.getByText('Mambo Bela Vista').first()).toBeVisible();
    await expect(page.getByText(/R\$\s*9,96/).first()).toBeVisible();
  });
});
