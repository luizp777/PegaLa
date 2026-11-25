import { expect, test } from '@playwright/test';

test.describe('Offline & PWA shell', () => {
  test('activates Service Worker, works offline after reload, and preserves IndexedDB data', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Mercado');

    const input = page.getByPlaceholder('Adicionar item...');
    await input.fill('3 arroz');
    await input.press('Enter');
    await expect(page.getByText('Arroz')).toBeVisible();

    // Wait for SW registration and activation if supported
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    });

    // Go offline and reload
    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Mercado');
    await expect(page.getByText('Arroz')).toBeVisible();

    // Can still add items while offline
    await page.getByPlaceholder('Adicionar item...').fill('Feijão');
    await page.getByPlaceholder('Adicionar item...').press('Enter');
    await expect(page.getByText('Feijão')).toBeVisible();

    await context.setOffline(false);
  });
});
