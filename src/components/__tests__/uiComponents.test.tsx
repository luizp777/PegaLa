// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShoppingItem, ShoppingList } from '../../types';
import { CATEGORIES } from '../../lib/dictionaryPtBr';
import { ShoppingItemRow } from '../ShoppingItemRow';
import { ActiveListToolbar } from '../ActiveListToolbar';
import { Header } from '../Header';
import { CategoryPickerSheet } from '../CategoryPickerSheet';
import { CategoryGroup } from '../CategoryGroup';
import { CheckedSection } from '../CheckedSection';
import { CreateListModal } from '../CreateListModal';
import { QuickCatalogDrawer } from '../QuickCatalogDrawer';
import { ShareModal } from '../ShareModal';
import { useTheme } from '../../hooks/useTheme';

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  hasImmediateAuthOrJoinIntent: () => false,
  getSupabaseClient: vi.fn(async () => null),
  ensureSupabaseSession: vi.fn(async () => null),
  signInWithGoogle: vi.fn(async () => ({ error: null })),
  signOutUser: vi.fn(async () => {}),
  supabase: null,
}));

afterEach(() => {
  cleanup();
});

function makeItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  const now = new Date().toISOString();
  return {
    id: 'item-1',
    listId: 'list-1',
    name: 'Leite integral',
    normalizedName: 'leite integral',
    quantity: 2,
    unit: 'L',
    categoryId: 'laticinios',
    isChecked: false,
    checkedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeList(overrides: Partial<ShoppingList> = {}): ShoppingList {
  const now = new Date().toISOString();
  return {
    id: 'list-1',
    name: 'Mercado',
    type: 'mercado',
    shareCode: 'PEGA-ABCD1234',
    ownerId: 'user-1',
    isSynced: true,
    isShared: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ShoppingItemRow', () => {
  it('renders item details and triggers toggle, stepper, edit, and delete callbacks', () => {
    const item = makeItem();
    const onToggle = vi.fn();
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    const onOpenCategoryPicker = vi.fn();
    const onDelete = vi.fn();

    render(
      <ShoppingItemRow
        item={item}
        onToggle={onToggle}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onOpenCategoryPicker={onOpenCategoryPicker}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Leite integral')).toBeInTheDocument();
    expect(screen.getByText('2L')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar Leite integral como pego' }));
    expect(onToggle).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Leite integral' }));
    expect(onIncrement).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade de Leite integral' }));
    expect(onDecrement).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole('button', { name: 'Editar Leite integral e corredor' }));
    expect(onOpenCategoryPicker).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole('button', { name: 'Remover Leite integral' }));
    expect(onDelete).toHaveBeenCalledWith(item);
  });
});

describe('ActiveListToolbar', () => {
  it('stays hidden for short single-category lists and renders search + pills for larger lists', () => {
    const singleCat = [{ category: CATEGORIES[0], count: 3 }];
    const { container, rerender } = render(
      <ActiveListToolbar
        pendingCount={3}
        categories={singleCat}
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedCategory="all"
        onSelectCategory={vi.fn()}
        allCollapsed={false}
        onToggleAllCollapsed={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();

    const onSearchChange = vi.fn();
    const onSelectCategory = vi.fn();
    const onToggleAllCollapsed = vi.fn();
    const multiCat = [
      { category: CATEGORIES[0], count: 6 },
      { category: CATEGORIES[1], count: 5 },
    ];

    rerender(
      <ActiveListToolbar
        pendingCount={11}
        categories={multiCat}
        searchQuery=""
        onSearchChange={onSearchChange}
        selectedCategory="all"
        onSelectCategory={onSelectCategory}
        allCollapsed={false}
        onToggleAllCollapsed={onToggleAllCollapsed}
      />
    );

    const searchInput = screen.getByLabelText('Filtrar itens da lista');
    fireEvent.change(searchInput, { target: { value: 'banana' } });
    expect(onSearchChange).toHaveBeenCalledWith('banana');

    fireEvent.click(screen.getByRole('button', { name: /Hortifrúti/i }));
    expect(onSelectCategory).toHaveBeenCalledWith('hortifruti');

    fireEvent.click(screen.getByRole('button', { name: 'Recolher todos os corredores' }));
    expect(onToggleAllCollapsed).toHaveBeenCalledTimes(1);
  });
});

describe('Header', () => {
  it('switches lists from dropdown and triggers manual sync button when pendingSyncCount > 0', () => {
    const list1 = makeList({ id: 'list-1', name: 'Mercado' });
    const list2 = makeList({ id: 'list-2', name: 'Farmácia', type: 'farmacia' });
    const onSelectList = vi.fn();
    const onForceSync = vi.fn();

    render(
      <Header
        lists={[list1, list2]}
        activeList={list1}
        pendingCount={4}
        checkedCount={1}
        onSelectList={onSelectList}
        onRenameList={vi.fn()}
        onOpenCreateList={vi.fn()}
        onDeleteList={vi.fn()}
        onLeaveList={vi.fn()}
        onOpenShare={vi.fn()}
        isDark={false}
        onToggleTheme={vi.fn()}
        wakeLockSupported={false}
        wakeLockActive={false}
        onToggleWakeLock={vi.fn()}
        isOnline={true}
        pendingSyncCount={3}
        onForceSync={onForceSync}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trocar lista' }));
    fireEvent.click(screen.getByText('Farmácia').closest('button')!);
    expect(onSelectList).toHaveBeenCalledWith('list-2');

    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar alterações pendentes agora' }));
    expect(onForceSync).toHaveBeenCalledTimes(1);
  });
});

describe('Ciclo 6 — Acessibilidade & UX', () => {
  it('exibe quantidade em itens marcados e define aria-pressed corretamente', () => {
    const checkedItem = makeItem({ isChecked: true, quantity: 3, unit: 'cx' });
    render(
      <ShoppingItemRow
        item={checkedItem}
        onToggle={vi.fn()}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onOpenCategoryPicker={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: 'Comprar Leite integral novamente' });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3 cx')).toBeInTheDocument();
  });

  it('salva edição ao pressionar Enter e permite excluir pelo CategoryPickerSheet', () => {
    const item = makeItem();
    const onSaveItem = vi.fn();
    const onDeleteItem = vi.fn();
    const onClose = vi.fn();

    render(
      <CategoryPickerSheet
        item={item}
        onSaveItem={onSaveItem}
        onDeleteItem={onDeleteItem}
        onClose={onClose}
      />
    );

    const nameInput = screen.getByLabelText('Nome do item');
    fireEvent.change(nameInput, { target: { value: 'Leite semidesnatado' } });
    fireEvent.submit(nameInput.closest('form')!);

    expect(onSaveItem).toHaveBeenCalledWith(item, {
      name: 'Leite semidesnatado',
      quantity: 2,
      unit: 'L',
      categoryId: 'laticinios',
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir item' }));
    expect(onDeleteItem).toHaveBeenCalledWith(item);
  });

  it('mantém button dentro de heading h2 no CategoryGroup e associa label ao input no CreateListModal', () => {
    const item = makeItem();
    render(
      <>
        <CategoryGroup
          category={CATEGORIES[0]}
          items={[item]}
          onToggle={vi.fn()}
          onIncrement={vi.fn()}
          onDecrement={vi.fn()}
          onOpenCategoryPicker={vi.fn()}
          onDelete={vi.fn()}
        />
        <CreateListModal open={true} onClose={vi.fn()} onCreate={vi.fn().mockResolvedValue(undefined)} />
      </>
    );

    const heading = screen.getByRole('heading', { level: 2, name: /Hortifruti/i });
    const expandBtn = heading.querySelector('button');
    expect(expandBtn).not.toBeNull();
    expect(expandBtn).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByLabelText('Nome da lista')).toHaveAttribute('id', 'create-list-name-input');
  });

  it('atualiza meta[name="theme-color"] ao alternar tema em useTheme', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#ffffff');
    document.head.appendChild(meta);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    function ThemeProbe() {
      const { isDark, toggleTheme } = useTheme();
      return (
        <button type="button" onClick={toggleTheme}>
          {isDark ? 'dark' : 'light'}
        </button>
      );
    }

    render(<ThemeProbe />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('light');
    expect(meta.getAttribute('content')).toBe('#ffffff');

    fireEvent.click(btn);
    expect(btn).toHaveTextContent('dark');
    expect(meta.getAttribute('content')).toBe('#09090b');

    meta.remove();
  });
});

describe('Ciclo 7 — Estabilidade de Foco, Menu & Filtros', () => {
  it('mantém foco no input do modal mesmo quando onClose muda a cada re-render do pai', () => {
    const item = makeItem();
    const onClose = vi.fn();

    const { rerender } = render(
      <CategoryPickerSheet
        item={item}
        onSaveItem={vi.fn()}
        onClose={() => onClose()}
      />
    );

    const nameInput = screen.getByLabelText('Nome do item');
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    // Simula re-render do App com nova referência inline de onClose
    rerender(
      <CategoryPickerSheet
        item={item}
        onSaveItem={vi.fn()}
        onClose={() => onClose()}
      />
    );

    expect(document.activeElement).toBe(nameInput);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restaura foco no botão Trocar lista ao fechar menu do Header com Escape', () => {
    const list1 = makeList({ id: 'list-1', name: 'Mercado' });
    render(
      <Header
        lists={[list1]}
        activeList={list1}
        pendingCount={1}
        checkedCount={0}
        onSelectList={vi.fn()}
        onRenameList={vi.fn()}
        onOpenCreateList={vi.fn()}
        onDeleteList={vi.fn()}
        onLeaveList={vi.fn()}
        onOpenShare={vi.fn()}
        isDark={false}
        onToggleTheme={vi.fn()}
        wakeLockSupported={false}
        wakeLockActive={false}
        onToggleWakeLock={vi.fn()}
        isOnline={true}
        pendingSyncCount={0}
      />
    );

    const trigger = screen.getByRole('button', { name: 'Trocar lista' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu', { name: 'Suas Listas' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Nova lista/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: 'Suas Listas' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('limpa o filtro de CheckedSection quando remontado com nova key ao trocar de lista', () => {
    const itemsA = Array.from({ length: 8 }, (_, idx) =>
      makeItem({
        id: `a-${idx}`,
        listId: 'list-a',
        name: `Item A ${idx}`,
        normalizedName: `item a ${idx}`,
        isChecked: true,
      })
    );
    const itemsB = Array.from({ length: 8 }, (_, idx) =>
      makeItem({
        id: `b-${idx}`,
        listId: 'list-b',
        name: `Item B ${idx}`,
        normalizedName: `item b ${idx}`,
        isChecked: true,
      })
    );

    const { rerender } = render(
      <CheckedSection
        key="list-a"
        items={itemsA}
        onToggle={vi.fn()}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onOpenCategoryPicker={vi.fn()}
        onDelete={vi.fn()}
        onRestartAll={vi.fn()}
      />
    );

    const filterInput = screen.getByLabelText('Filtrar itens salvos');
    fireEvent.change(filterInput, { target: { value: 'Item A 0' } });
    expect(filterInput).toHaveValue('Item A 0');

    rerender(
      <CheckedSection
        key="list-b"
        items={itemsB}
        onToggle={vi.fn()}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onOpenCategoryPicker={vi.fn()}
        onDelete={vi.fn()}
        onRestartAll={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Filtrar itens salvos')).toHaveValue('');
    expect(screen.getByText('Item B 0')).toBeInTheDocument();
  });
});

describe('QuickCatalogDrawer & ShareModal', () => {
  it('renders QuickCatalogDrawer, filters catalog items, and adds new item on click', () => {
    const onAddNew = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickCatalogDrawer
        open={true}
        listType="mercado"
        frequentItems={[]}
        uncheckedByNormalizedName={new Map()}
        checkedByNormalizedName={new Map()}
        onAddNew={onAddNew}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onClose={onClose}
      />
    );

    const searchInput = screen.getByLabelText('Buscar no catálogo');
    fireEvent.change(searchInput, { target: { value: 'Banana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Banana prata' }));
    expect(onAddNew).toHaveBeenCalledWith('Banana prata');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders ShareModal with share code, QR toggle, and copy action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const list = makeList({ shareCode: 'PEGA-XYZ123' });
    render(
      <ShareModal
        open={true}
        list={list}
        onClose={vi.fn()}
        onJoinedList={vi.fn()}
      />
    );

    expect(screen.getByText('PEGA-XYZ123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith('PEGA-XYZ123');

    const qrBtn = screen.getByRole('button', { name: 'Mostrar QR Code' });
    fireEvent.click(qrBtn);
    expect(screen.getByRole('button', { name: 'Ocultar QR Code' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
