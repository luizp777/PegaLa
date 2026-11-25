// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuickAddBar } from '../QuickAddBar';
import type { ShoppingList } from '../../types';

afterEach(() => {
  cleanup();
});

const mockList: ShoppingList = {
  id: 'list-1',
  name: 'Mercado',
  type: 'mercado',
  shareCode: 'PEGA-1234',
  ownerId: null,
  isSynced: false,
  isShared: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('QuickAddBar', () => {
  it('submits typed items and exposes accessible input label', async () => {
    const onAddText = vi.fn().mockResolvedValue([]);
    render(
      <QuickAddBar
        lists={[mockList]}
        activeList={mockList}
        onSelectList={vi.fn()}
        onOpenCreateList={vi.fn()}
        onAddText={onAddText}
        onIncrementItem={vi.fn()}
        onDecrementItem={vi.fn()}
        onApplyQuickQtyToLastItem={vi.fn().mockResolvedValue(false)}
        userHistory={[]}
        uncheckedByNormalizedName={new Map()}
        checkedByNormalizedName={new Map()}
        onShowToast={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Adicionar item à lista');
    fireEvent.change(input, { target: { value: '2 kg arroz' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(onAddText).toHaveBeenCalledWith('2 kg arroz');
    });
  });

  it('triggers autocomplete suggestion on click (not pointerDown) to preserve horizontal scrolling', async () => {
    const onAddText = vi.fn().mockResolvedValue([]);
    render(
      <QuickAddBar
        lists={[mockList]}
        activeList={mockList}
        onSelectList={vi.fn()}
        onOpenCreateList={vi.fn()}
        onAddText={onAddText}
        onIncrementItem={vi.fn()}
        onDecrementItem={vi.fn()}
        onApplyQuickQtyToLastItem={vi.fn().mockResolvedValue(false)}
        userHistory={[]}
        uncheckedByNormalizedName={new Map()}
        checkedByNormalizedName={new Map()}
        onShowToast={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Adicionar item à lista');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'arr' } });

    const suggestionBtn = await screen.findByRole('button', { name: /^arroz$/i });

    // Pointer down alone (e.g. starting a horizontal scroll) must NOT add the item
    fireEvent.pointerDown(suggestionBtn);
    expect(onAddText).not.toHaveBeenCalled();

    // Actual click adds the item
    fireEvent.click(suggestionBtn);
    await waitFor(() => {
      expect(onAddText).toHaveBeenCalledWith(expect.stringMatching(/arroz/i));
    });
  });
});
