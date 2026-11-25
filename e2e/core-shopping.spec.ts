import { expect, test } from '@playwright/test';

test.describe('Core shopping flow', () => {
  test('creates list, adds items with parser, checks off, and restarts purchase', async ({ page }) => {
    await page.goto('/');

    // Wait for default Mercado list hydration
    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Mercado');

    // Add items using smart parser
    const input = page.getByPlaceholder('Adicionar item...');
    await input.fill('2 leite integral');
    await input.press('Enter');

    await input.fill('500g tomate');
    await input.press('Enter');

    await expect(page.getByText('Leite integral')).toBeVisible();
    await expect(page.getByRole('main').getByText('2x')).toBeVisible();
    await expect(page.getByText('Tomate')).toBeVisible();
    await expect(page.getByRole('main').getByText('500g')).toBeVisible();

    // Increment quantity via inline stepper
    await page.getByRole('button', { name: 'Aumentar quantidade de Leite integral' }).click();
    await expect(page.getByRole('main').getByText('3x')).toBeVisible();

    // Check off both items to reach ShoppingCompleteCard
    await page.getByRole('button', { name: 'Marcar Leite integral como pego' }).click();
    await page.getByRole('button', { name: 'Marcar Tomate como pego' }).click();

    await expect(page.getByText(/Compra concluída/i)).toBeVisible();

    // Restart all checked items
    await page.getByRole('button', { name: 'Recomeçar lista' }).click();
    await expect(page.getByText('Leite integral')).toBeVisible();
  });

  test('supports PWA ?list=farmacia shortcut and cleans URL', async ({ page }) => {
    await page.goto('/?list=farmacia');

    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Farmácia');
    await expect(page).toHaveURL(/\/$/);
  });

  test('creates a new custom list from QuickAddBar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Criar nova lista' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nova Lista' });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Ex: Churrasco, Feira, Farmácia...').fill('Churrasco');
    await dialog.getByRole('button', { name: /Criar lista/i }).click();

    await expect(page.getByRole('button', { name: 'Trocar lista' })).toContainText('Churrasco');
  });
});
