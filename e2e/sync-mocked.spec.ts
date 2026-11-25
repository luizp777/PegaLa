import { expect, test } from '@playwright/test';

test.use({
  baseURL: 'http://localhost:4174',
  serviceWorkers: 'block',
});

test.describe('Supabase sync & sharing (mocked network)', () => {
  test('joins shared list via ?join=PEGA-E2E123 and loads mocked items', async ({ page }) => {
    const mockUserId = '11111111-1111-4111-8111-111111111111';
    const mockListId = '22222222-2222-4222-8222-222222222222';
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
            user: {
              id: mockUserId,
              aud: 'authenticated',
              role: 'authenticated',
              is_anonymous: true,
            },
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

    await page.route('https://e2e-mock.supabase.co/rest/v1/rpc/join_list_by_share_code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: mockListId,
            name: 'Lista Compartilhada E2E',
            type: 'mercado',
            share_code: 'PEGA-E2E123',
            owner_id: '33333333-3333-4333-8333-333333333333',
            created_at: now,
            updated_at: now,
          },
        ]),
      });
    });

    await page.route('https://e2e-mock.supabase.co/rest/v1/list_items**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '44444444-4444-4444-8444-444444444444',
              list_id: mockListId,
              name: 'Pão francês',
              normalized_name: 'pao frances',
              quantity: 6,
              unit: 'un',
              category_id: 'padaria',
              is_checked: false,
              checked_at: null,
              created_at: now,
              updated_at: now,
            },
          ]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('https://e2e-mock.supabase.co/rest/v1/lists**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.routeWebSocket(/wss:\/\/e2e-mock\.supabase\.co\/realtime\/v1\/websocket.*/, (ws) => {
      ws.onMessage(() => {
        // Keep mocked websocket open silently
      });
    });

    await page.goto('/?join=PEGA-E2E123');

    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText(
      'Lista Compartilhada E2E'
    );
    await expect(page.getByText('Pão francês')).toBeVisible();
  });

  test('displays rate limit error message on P0001 from join_list_by_share_code', async ({ page }) => {
    const mockUserId = '11111111-1111-4111-8111-111111111111';

    await page.route('https://e2e-mock.supabase.co/auth/v1/**', async (route) => {
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
    });

    await page.route('https://e2e-mock.supabase.co/rest/v1/rpc/join_list_by_share_code', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'P0001',
          message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
        }),
      });
    });

    await page.goto('/?join=PEGA-FAIL99');
    await expect(page.getByText(/Muitas tentativas\. Aguarde 1 minuto/i)).toBeVisible();
  });
});
