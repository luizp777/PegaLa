import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Loader2, Mic, RotateCcw, ShoppingBag } from 'lucide-react';
import {
  addItemsFromText,
  createList,
  decrementItemQuantity,
  decrementOrMarkChecked,
  deleteItem,
  deleteList,
  incrementItemQuantity,
  restoreDeletedItem,
  setItemExactQuantityAndUnit,
  toggleItemChecked,
  uncheckAllItems,
  updateItemCategory,
} from './db/localDb';
import { useActiveList } from './hooks/useActiveList';
import { useTheme } from './hooks/useTheme';
import { useWakeLock } from './lib/wakeLock';
import { hapticLight } from './lib/haptics';
import { Header } from './components/Header';
import { CategoryGroup } from './components/CategoryGroup';
import { CheckedSection } from './components/CheckedSection';
import { QuickAddBar, type QuickAddBarHandle } from './components/QuickAddBar';
import type { CategoryId, ShoppingItem } from './types';

const ShareModal = lazy(() =>
  import('./components/ShareModal').then((m) => ({ default: m.ShareModal }))
);
const CreateListModal = lazy(() =>
  import('./components/CreateListModal').then((m) => ({ default: m.CreateListModal }))
);
const CategoryPickerSheet = lazy(() =>
  import('./components/CategoryPickerSheet').then((m) => ({ default: m.CategoryPickerSheet }))
);

/**
 * Estado da notificação toast temporária exibida no topo da tela.
 */
interface ToastState {
  /** Mensagem principal exibida ao usuário. */
  message: string;
  /** Item recém-excluído que pode ser restaurado pelo botão "Desfazer". */
  undoItem?: ShoppingItem;
}

/**
 * Componente raiz do aplicativo **PegaLá**, orquestrando estado reativo da lista ativa,
 * agrupamento por corredor, seção "No carrinho", dock inferior touchscreen, modais e toasts com desfazer.
 *
 * @returns Interface completa do aplicativo PegaLá.
 */
export function App() {
  const {
    lists,
    activeList,
    isJoiningSharedList,
    groupedPending,
    checkedItems,
    frequentSuggestions,
    isOnline,
    pendingSyncCount,
    selectList,
    joinToast,
    clearJoinToast,
  } = useActiveList();

  const { isDark, toggleTheme } = useTheme();
  const wakeLock = useWakeLock();

  const [shareOpen, setShareOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryPickerItem, setCategoryPickerItem] = useState<ShoppingItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pegala_swipe_hint_seen') !== '1';
    } catch {
      return false;
    }
  });
  const lastAddedItemRef = useRef<ShoppingItem | null>(null);
  const quickAddBarRef = useRef<QuickAddBarHandle>(null);

  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    try {
      localStorage.setItem('pegala_swipe_hint_seen', '1');
    } catch {
      // Ignora erro de armazenamento
    }
  };

  const showToast = (message: string, undoItem?: ShoppingItem) => {
    setToast({ message, undoItem });
  };

  const activeToast: ToastState | null = toast ?? (joinToast ? { message: joinToast } : null);

  useEffect(() => {
    if (!toast) return;
    const duration = toast.undoItem ? 4200 : 2500;
    const t = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!joinToast) return;
    const t = setTimeout(() => clearJoinToast(), 2600);
    return () => clearTimeout(t);
  }, [joinToast, clearJoinToast]);

  const uncheckedByNormalizedName = useMemo(() => {
    const map = new Map<string, ShoppingItem>();
    for (const group of groupedPending) {
      for (const item of group.items) {
        map.set(item.normalizedName, item);
      }
    }
    return map;
  }, [groupedPending]);

  const checkedByNormalizedName = useMemo(() => {
    const map = new Map<string, ShoppingItem>();
    for (const item of checkedItems) {
      map.set(item.normalizedName, item);
    }
    return map;
  }, [checkedItems]);

  const pendingCount = useMemo(
    () => groupedPending.reduce((acc, g) => acc + g.items.length, 0),
    [groupedPending]
  );

  const handleAddText = async (rawText: string): Promise<ShoppingItem[]> => {
    if (!activeList) return [];
    const added = await addItemsFromText(activeList.id, rawText);
    if (added.length > 0) {
      lastAddedItemRef.current = added[added.length - 1];
    }
    if (added.length > 1) {
      showToast(`${added.length} itens adicionados à lista!`);
    }
    return added;
  };

  const handleApplyQuickQtyToLastItem = async (
    quantity: number,
    unit: string
  ): Promise<boolean> => {
    const last = lastAddedItemRef.current;
    if (!last || !activeList || last.listId !== activeList.id) return false;
    const current = uncheckedByNormalizedName.get(last.normalizedName);
    if (!current) return false;
    await setItemExactQuantityAndUnit(current, quantity, unit);
    showToast(`${current.name} atualizado`);
    return true;
  };

  const handleRowDecrement = async (item: ShoppingItem) => {
    await decrementItemQuantity(item);
  };

  const handleCatalogDecrement = async (item: ShoppingItem) => {
    const result = await decrementOrMarkChecked(item);
    if (result === 'checked') {
      showToast(`"${item.name}" movido para "Já tenho"`);
    }
  };

  const handleDelete = async (item: ShoppingItem) => {
    await deleteItem(item);
    showToast(`"${item.name}" removido`, item);
  };

  const handleUndoDelete = async () => {
    if (!toast?.undoItem) return;
    hapticLight();
    const itemToRestore = toast.undoItem;
    setToast(null);
    await restoreDeletedItem(itemToRestore);
  };

  const handleRestartList = async () => {
    if (!activeList) return;
    hapticLight();
    const count = await uncheckAllItems(activeList.id);
    if (count > 0) {
      showToast(`${count} ${count === 1 ? 'item reativado' : 'itens reativados'} para compra!`);
    }
  };

  const handleCreateList = async (name: string, type: 'mercado' | 'farmacia' | 'geral') => {
    const created = await createList(name, type);
    selectList(created.id);
    showToast(`Lista "${created.name}" criada!`);
  };

  const handleDeleteList = async (id: string) => {
    await deleteList(id);
    const remaining = lists.filter((l) => l.id !== id);
    if (remaining.length > 0) {
      selectList(remaining[0].id);
    }
  };

  const handleCategorySelected = async (item: ShoppingItem, categoryId: CategoryId) => {
    await updateItemCategory(item, categoryId);
    showToast('Corredor atualizado e aprendido!');
  };

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Header
        lists={lists}
        activeList={activeList}
        pendingCount={pendingCount}
        checkedCount={checkedItems.length}
        onSelectList={selectList}
        onOpenCreateList={() => setCreateOpen(true)}
        onDeleteList={handleDeleteList}
        onOpenShare={() => setShareOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        wakeLockSupported={wakeLock.isSupported}
        wakeLockActive={wakeLock.isActive}
        onToggleWakeLock={wakeLock.toggleWakeLock}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Toast Notification with Optional Undo Action */}
      {activeToast && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-zinc-800 dark:ring-1 dark:ring-zinc-700">
            <span>{activeToast.message}</span>
            {activeToast.undoItem && (
              <button
                type="button"
                onClick={() => void handleUndoDelete()}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Desfazer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content (extra bottom padding for Thumb-Zone Dock + List Tabs) */}
      <main className="mx-auto max-w-2xl px-3 pb-44 pt-3.5 sm:px-4">
        {/* Loading Shared List State */}
        {isJoiningSharedList ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 bg-white/70 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Abrindo lista compartilhada...
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Conectando e carregando os itens em tempo real.
            </p>
          </div>
        ) : pendingCount === 0 && checkedItems.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Sua lista "{activeList?.name}" está vazia
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
              Use a barra abaixo com uma mão só para montar sua compra em segundos:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              <button
                type="button"
                onClick={() => quickAddBarRef.current?.openCatalog()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 ring-1 ring-zinc-200/80 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-500/40 active:scale-95 dark:bg-zinc-800 dark:ring-zinc-700/80 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-emerald-500" />
                Toque no Catálogo Rápido
              </button>
              <button
                type="button"
                onClick={() => quickAddBarRef.current?.triggerVoice()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 ring-1 ring-zinc-200/80 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-500/40 active:scale-95 dark:bg-zinc-800 dark:ring-zinc-700/80 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
              >
                <Mic className="h-3.5 w-3.5 text-emerald-500" />
                Fale os itens no microfone
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* One-time Touch Gesture Onboarding Hint */}
            {showSwipeHint && pendingCount > 0 && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-200">
                <span>Toque no ícone para marcar · Deslize ← para excluir</span>
                <button
                  type="button"
                  onClick={dismissSwipeHint}
                  className="shrink-0 rounded-lg bg-emerald-600/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                >
                  OK
                </button>
              </div>
            )}

            {/* Pending Items Grouped by Aisle / Category */}
            {groupedPending.map(({ category, items }) => (
              <CategoryGroup
                key={category.id}
                category={category}
                items={items}
                onToggle={(item) => void toggleItemChecked(item)}
                onIncrement={(item) => void incrementItemQuantity(item)}
                onDecrement={(item) => void handleRowDecrement(item)}
                onOpenCategoryPicker={(item) => setCategoryPickerItem(item)}
                onDelete={(item) => void handleDelete(item)}
              />
            ))}

            {/* All Done Banner when only checked items remain */}
            {pendingCount === 0 && checkedItems.length > 0 && (
              <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Tudo pego! Seus itens continuam salvos abaixo para a próxima compra.
              </div>
            )}

            {/* Checked ("No carrinho / Já tenho") Permanent Section */}
            <CheckedSection
              items={checkedItems}
              onToggle={(item) => void toggleItemChecked(item)}
              onIncrement={(item) => void incrementItemQuantity(item)}
              onDecrement={(item) => void handleRowDecrement(item)}
              onOpenCategoryPicker={(item) => setCategoryPickerItem(item)}
              onDelete={(item) => void handleDelete(item)}
              onRestartAll={() => void handleRestartList()}
            />
          </>
        )}
      </main>

      {/* Thumb-Zone Bottom Dock (Catalog Drawer + List Tabs + Qty Pills + Voice + Paste + Input) */}
      <QuickAddBar
        barRef={quickAddBarRef}
        lists={lists}
        activeList={activeList}
        onSelectList={selectList}
        onOpenCreateList={() => setCreateOpen(true)}
        onAddText={handleAddText}
        onIncrementItem={(item) => void incrementItemQuantity(item)}
        onDecrementItem={(item) => void handleCatalogDecrement(item)}
        onApplyQuickQtyToLastItem={handleApplyQuickQtyToLastItem}
        userHistory={frequentSuggestions}
        uncheckedByNormalizedName={uncheckedByNormalizedName}
        checkedByNormalizedName={checkedByNormalizedName}
        onShowToast={(msg) => showToast(msg)}
      />

      {/* Modals & Bottom Sheets (lazy-loaded on demand) */}
      <Suspense fallback={null}>
        {categoryPickerItem && (
          <CategoryPickerSheet
            item={categoryPickerItem}
            onSelectCategory={(item, catId) => void handleCategorySelected(item, catId)}
            onClose={() => setCategoryPickerItem(null)}
          />
        )}

        {shareOpen && (
          <ShareModal
            open={shareOpen}
            list={activeList}
            onClose={() => setShareOpen(false)}
            onJoinedList={(id) => {
              selectList(id);
              showToast('Lista compartilhada adicionada!');
            }}
          />
        )}

        {createOpen && (
          <CreateListModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreate={handleCreateList}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
