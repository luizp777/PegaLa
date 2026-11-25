import { expect, test } from '@playwright/test';

test.describe('Mobile & Accessibility flows', () => {
  test('supports modal Escape, accessible item edit/delete, theme toggle, and diagnostics copy', async ({
    page,
    context,
    browserName,
  }) => {
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Trocar lista' })).toBeVisible();

    // Add item and open CategoryPickerSheet
    const input = page.getByPlaceholder('Adicionar item...');
    await input.fill('Café');
    await input.press('Enter');

    await page.getByRole('button', { name: 'Editar Café e corredor' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Café' });
    await expect(editDialog).toBeVisible();

    // Close via Escape
    await page.keyboard.press('Escape');
    await expect(editDialog).toBeHidden();

    // Reopen and delete item via accessible button
    await page.getByRole('button', { name: 'Editar Café e corredor' }).click();
    await editDialog.getByRole('button', { name: 'Excluir item' }).click();
    await expect(page.getByText(/removido/i)).toBeVisible();

    // Toggle theme
    const themeBtn = page.getByRole('button', { name: 'Alternar tema' });
    await themeBtn.click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Copy diagnostics from Header menu
    await page.getByRole('button', { name: 'Trocar lista' }).click();
    await page.getByRole('menuitem', { name: 'Copiar diagnóstico' }).click();
    await expect(page.getByText(/Diagnóstico copiado|Não foi possível copiar/i)).toBeVisible();
  });
});
