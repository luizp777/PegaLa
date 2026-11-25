import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, LayoutGrid, Loader2, Mic, RotateCcw, ShoppingBag } from 'lucide-react';
import {
  addItemsFromText,
  createList,
  decrementItemQuantity,
  decrementOrMarkChecked,
  deleteItem,
  deleteList,
  getPriceComparisonCache,
  incrementItemQuantity,
  leaveList,
  renameList,
  restoreDeletedItem,
  savePriceComparisonCache,
  setItemExactQuantityAndUnit,
  toggleItemChecked,
  uncheckAllItems,
  updateItemDetails,
} from './db/localDb';
import { flushPendingSync } from './db/syncEngine';
import { useActiveList } from './hooks/useActiveList';
import { clearPinnedStoreStorage, usePinnedStore } from './hooks/usePinnedStore';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useTheme } from './hooks/useTheme';
import { isPersistedStoreId, type PriceQuoteCandidate } from '../shared/priceTypes';
import { normalizeText } from './lib/dictionaryPtBr';
import { buildDiagnosticsReport } from './lib/diagnostics';
import { isSpeechRecognitionSupported } from './lib/speechParser';
import { ensureSupabaseSession, isSupabaseConfigured, supabase } from './lib/supabase';
import { useWakeLock } from './lib/wakeLock';
import { hapticLight } from './lib/haptics';
import { ActiveListToolbar } from './components/ActiveListToolbar';
import { Header } from './components/Header';
import { PinnedStoreBar } from './components/PinnedStoreBar';
import { CategoryGroup } from './components/CategoryGroup';
import { CheckedSection } from './components/CheckedSection';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { QuickAddBar, type QuickAddBarHandle } from './components/QuickAddBar';
import { ShoppingCompleteCard } from './components/ShoppingCompleteCard';
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
const PriceComparisonSheet = lazy(() =>
  import('./components/PriceComparisonSheet').then((m) => ({ default: m.PriceComparisonSheet }))
);

/**
 * Estado da notificação toast temporária exibida no topo da tela.
 */
interface ToastState {
  /** Mensagem principal exibida ao usuário. */
  message: string;
  /** Item recém-excluído que pode ser restaurado pelo botão "Desfazer". */
  undoItem?: ShoppingItem;
  /** Item recém-marcado elegível para captura rápida de preço na loja ativa. */
  priceItem?: ShoppingItem;
}

const COLLAPSED_PREFIX = 'pegala_collapsed_';

function loadCollapsedCategories(listId: string | undefined): Set<CategoryId> {
  if (!listId) return new Set();
  try {
    const raw = localStorage.getItem(`${COLLAPSED_PREFIX}${listId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as CategoryId[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsedCategories(listId: string | undefined, collapsed: Set<CategoryId>): void {
  if (!listId) return;
  try {
    if (collapsed.size === 0) {
      localStorage.removeItem(`${COLLAPSED_PREFIX}${listId}`);
    } else {
      localStorage.setItem(`${COLLAPSED_PREFIX}${listId}`, JSON.stringify(Array.from(collapsed)));
    }
  } catch {
    // Ignora erro de armazenamento
  }
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
    isLoadingList,
    groupedPending,
    checkedItems,
    frequentSuggestions,
    isOnline,
    pendingSyncCount,
    selectList,
    joinToast,
    clearJoinToast,
  } = useActiveList();

  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((message: string, undoItem?: ShoppingItem, priceItem?: ShoppingItem) => {
    setToast({ message, undoItem, priceItem });
  }, []);

  const { isDark, toggleTheme } = useTheme();
  const pwaInstall = usePwaInstall();
  const wakeLock = useWakeLock((msg) => showToast(msg));

  const [shareOpen, setShareOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [priceCompareOpen, setPriceCompareOpen] = useState(false);
  const [quickPriceItem, setQuickPriceItem] = useState<ShoppingItem | null>(null);
  const [quickPriceValue, setQuickPriceValue] = useState('');
  const [categoryPickerItem, setCategoryPickerItem] = useState<ShoppingItem | null>(null);
  const [listFilter, setListFilter] = useState<{
    listId: string | undefined;
    query: string;
    category: CategoryId | 'all';
  }>({ listId: undefined, query: '', category: 'all' });
  const [collapsedState, setCollapsedState] = useState<{
    listId: string | undefined;
    set: Set<CategoryId>;
  }>(() => ({
    listId: activeList?.id,
    set: loadCollapsedCategories(activeList?.id),
  }));
  const [isSyncing, setIsSyncing] = useState(false);
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

  const activeListId = activeList?.id;
  const listSearchQuery = listFilter.listId === activeListId ? listFilter.query : '';
  const rawSelectedCategory = listFilter.listId === activeListId ? listFilter.category : 'all';
  const selectedCategory =
    rawSelectedCategory !== 'all' &&
    !groupedPending.some((g) => g.category.id === rawSelectedCategory)
      ? 'all'
      : rawSelectedCategory;

  const collapsedCategories = useMemo(
    () =>
      collapsedState.listId === activeListId
        ? collapsedState.set
        : loadCollapsedCategories(activeListId),
    [collapsedState, activeListId]
  );

  const setListSearchQuery = useCallback(
    (query: string) => {
      setListFilter({ listId: activeListId, query, category: selectedCategory });
    },
    [activeListId, selectedCategory]
  );

  const setSelectedCategory = useCallback(
    (category: CategoryId | 'all') => {
      setListFilter({ listId: activeListId, query: listSearchQuery, category });
    },
    [activeListId, listSearchQuery]
  );

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

  const toolbarCategories = useMemo(
    () => groupedPending.map((g) => ({ category: g.category, count: g.items.length })),
    [groupedPending]
  );

  const filteredGroups = useMemo(() => {
    const normQuery = normalizeText(listSearchQuery);
    return groupedPending
      .filter((g) => selectedCategory === 'all' || g.category.id === selectedCategory)
      .map((g) => ({
        category: g.category,
        items: normQuery
          ? g.items.filter((item) => item.normalizedName.includes(normQuery))
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groupedPending, selectedCategory, listSearchQuery]);

  const allCollapsed = useMemo(
    () =>
      groupedPending.length > 0 &&
      groupedPending.every((g) => collapsedCategories.has(g.category.id)),
    [groupedPending, collapsedCategories]
  );

  const handleToggleCategoryExpand = useCallback(
    (categoryId: CategoryId) => {
      setCollapsedState((prev) => {
        const base =
          prev.listId === activeListId ? prev.set : loadCollapsedCategories(activeListId);
        const next = new Set(base);
        if (next.has(categoryId)) next.delete(categoryId);
        else next.add(categoryId);
        saveCollapsedCategories(activeListId, next);
        return { listId: activeListId, set: next };
      });
    },
    [activeListId]
  );

  const handleToggleAllCollapsed = useCallback(() => {
    hapticLight();
    setCollapsedState((prev) => {
      const base =
        prev.listId === activeListId ? prev.set : loadCollapsedCategories(activeListId);
      const shouldExpandAll =
        groupedPending.length > 0 && groupedPending.every((g) => base.has(g.category.id));
      const next = shouldExpandAll
        ? new Set<CategoryId>()
        : new Set(groupedPending.map((g) => g.category.id));
      saveCollapsedCategories(activeListId, next);
      return { listId: activeListId, set: next };
    });
  }, [activeListId, groupedPending]);

  const handleForceSync = useCallback(async () => {
    if (isSyncing) return;
    hapticLight();
    setIsSyncing(true);
    try {
      const ok = await flushPendingSync();
      showToast(
        ok
          ? 'Sincronizado com a nuvem!'
          : 'Algumas alterações ainda aguardam conexão.'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, showToast]);

  const handleCopyDiagnostics = useCallback(async () => {
    try {
      const report = await buildDiagnosticsReport();
      await navigator.clipboard.writeText(report);
      showToast('Diagnóstico copiado!');
    } catch {
      showToast('Não foi possível copiar o diagnóstico.');
    }
  }, [showToast]);

  const pendingItems = useMemo(() => groupedPending.flatMap((g) => g.items), [groupedPending]);
  const { pinnedStore, summary: pinnedSummary, pinStore, unpinStore } = usePinnedStore({
    listId: activeList?.id,
    pendingItems,
    checkedItems,
  });

  const handleToggleItem = useCallback(
    (item: ShoppingItem) => {
      const markingAsChecked = !item.isChecked;
      void toggleItemChecked(item);
      if (markingAsChecked && pinnedStore && isPersistedStoreId(pinnedStore.id) && isSupabaseConfigured) {
        showToast(`${item.name} no carrinho`, undefined, item);
      }
    },
    [pinnedStore, showToast]
  );

  const handleSaveQuickPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPriceItem || !pinnedStore || !supabase) return;
    const val = Number(quickPriceValue.replace(',', '.'));
    if (!Number.isFinite(val) || val < 0.1) {
      showToast('Informe um preço válido (ex.: 5,49).');
      return;
    }
    await ensureSupabaseSession();
    const { data, error } = await supabase.rpc('report_community_price', {
      p_store_id: pinnedStore.id,
      p_normalized_term: quickPriceItem.normalizedName,
      p_product_title: quickPriceItem.name,
      p_pack_quantity: 1,
      p_pack_unit: quickPriceItem.unit || 'un',
      p_price_cents: Math.round(val * 100),
    });

    if (!error && data && activeList) {
      const row = data as {
        id: string;
        store_id: string | null;
        chain_slug: string | null;
        normalized_term: string;
        product_key: string;
        product_title: string;
        brand: string | null;
        ean: string | null;
        pack_quantity: number;
        pack_unit: string;
        price_cents: number;
        weight: number;
        observed_at: string;
        expires_at: string;
      };
      const existingCache = await getPriceComparisonCache(activeList.id);
      if (existingCache) {
        const newCandidate: PriceQuoteCandidate = {
          id: row.id,
          storeId: row.store_id,
          chainSlug: row.chain_slug,
          normalizedTerm: row.normalized_term,
          productKey: row.product_key,
          productTitle: row.product_title,
          brand: row.brand,
          ean: row.ean,
          packQuantity: Number(row.pack_quantity) || 1,
          packUnit: row.pack_unit || 'un',
          priceCents: row.price_cents,
          source: 'community',
          observedAt: row.observed_at,
          expiresAt: row.expires_at,
          weight: Number(row.weight) || 1,
        };
        await savePriceComparisonCache({
          ...existingCache,
          candidates: [newCandidate, ...existingCache.candidates],
          computedAt: new Date().toISOString(),
        });
      }
    }

    setQuickPriceItem(null);
    setQuickPriceValue('');
    showToast(error ? error.message : `Preço salvo em ${pinnedStore.name}!`);
  };

  const handleIncrementItem = useCallback((item: ShoppingItem) => {
    void incrementItemQuantity(item);
  }, []);

  const handleOpenCategoryPicker = useCallback((item: ShoppingItem) => {
    setCategoryPickerItem(item);
  }, []);

  const handleAddText = useCallback(
    async (rawText: string): Promise<ShoppingItem[]> => {
      if (!activeList) return [];
      const added = await addItemsFromText(activeList.id, rawText);
      if (added.length > 0) {
        lastAddedItemRef.current = added[added.length - 1];
      }
      if (added.length > 1) {
        showToast(`${added.length} itens adicionados à lista!`);
      }
      return added;
    },
    [activeList, showToast]
  );

  const handleApplyQuickQtyToLastItem = useCallback(
    async (quantity: number, unit: string): Promise<boolean> => {
      const last = lastAddedItemRef.current;
      if (!last || !activeList || last.listId !== activeList.id) return false;
      const current = uncheckedByNormalizedName.get(last.normalizedName);
      if (!current) return false;
      await setItemExactQuantityAndUnit(current, quantity, unit);
      showToast(`${current.name} atualizado`);
      return true;
    },
    [activeList, uncheckedByNormalizedName, showToast]
  );

  const handleRowDecrement = useCallback((item: ShoppingItem) => {
    void decrementItemQuantity(item);
  }, []);

  const handleCatalogDecrement = useCallback(
    async (item: ShoppingItem) => {
      const result = await decrementOrMarkChecked(item);
      if (result === 'checked') {
        showToast(`"${item.name}" movido para "Já tenho"`);
      }
    },
    [showToast]
  );

  const handleDelete = useCallback(
    async (item: ShoppingItem) => {
      await deleteItem(item);
      showToast(`"${item.name}" removido`, item);
    },
    [showToast]
  );

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
    clearPinnedStoreStorage(id);
    await deleteList(id);
    const remaining = lists.filter((l) => l.id !== id);
    if (remaining.length > 0) {
      selectList(remaining[0].id);
    }
  };

  const handleLeaveList = async (id: string) => {
    clearPinnedStoreStorage(id);
    const target = lists.find((l) => l.id === id);
    await leaveList(id);
    const remaining = lists.filter((l) => l.id !== id);
    if (remaining.length > 0) {
      selectList(remaining[0].id);
    }
    if (target) {
      showToast(`Você saiu da lista "${target.name}"`);
    }
  };

  const handleRenameList = async (id: string, newName: string) => {
    await renameList(id, newName);
    showToast(`Lista renomeada para "${newName}"`);
  };

  const handleSaveItemDetails = async (
    item: ShoppingItem,
    updates: { name: string; quantity: number; unit: string; categoryId: CategoryId }
  ) => {
    await updateItemDetails(item, updates);
    showToast(
      updates.categoryId !== item.categoryId
        ? 'Item atualizado e corredor aprendido!'
        : 'Item atualizado!'
    );
  };

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="sticky top-0 z-30">
        <Header
          lists={lists}
          activeList={activeList}
          pendingCount={pendingCount}
          checkedCount={checkedItems.length}
          onSelectList={selectList}
          onRenameList={(id, newName) => void handleRenameList(id, newName)}
          onOpenCreateList={() => setCreateOpen(true)}
          onDeleteList={handleDeleteList}
          onLeaveList={handleLeaveList}
          onOpenShare={() => setShareOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          wakeLockSupported={wakeLock.isSupported}
          wakeLockActive={wakeLock.isActive}
          onToggleWakeLock={wakeLock.toggleWakeLock}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          isSyncing={isSyncing}
          onForceSync={() => void handleForceSync()}
          onCopyDiagnostics={() => void handleCopyDiagnostics()}
        />
        {pinnedStore && pinnedSummary && (
          <PinnedStoreBar
            store={pinnedStore}
            summary={pinnedSummary}
            onOpenComparator={() => setPriceCompareOpen(true)}
            onUnpin={unpinStore}
          />
        )}

        {/* Toast Notification with Optional Undo Action */}
        {activeToast && (
          <div
            role="status"
            aria-live="polite"
            className="animate-toast-in pointer-events-none absolute inset-x-0 top-full z-40 mt-2 flex justify-center px-4"
          >
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-zinc-800 dark:ring-1 dark:ring-zinc-700">
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
              {activeToast.priceItem && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriceItem(activeToast.priceItem ?? null);
                    setQuickPriceValue('');
                    setToast(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white active:scale-95"
                >
                  + Preço
                </button>
              )}
            </div>
          </div>
        )}

        {quickPriceItem && pinnedStore && (
          <div className="absolute inset-x-0 top-full z-40 mt-2 flex justify-center px-4">
            <form
              onSubmit={(e) => void handleSaveQuickPrice(e)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setQuickPriceItem(null);
              }}
              className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-emerald-500/30 bg-white p-2.5 shadow-xl dark:bg-zinc-900"
            >
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">
                {quickPriceItem.name} (1 {quickPriceItem.unit || 'un'}) • {pinnedStore.name}:
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={quickPriceValue}
                onChange={(e) => setQuickPriceValue(e.target.value)}
                placeholder="R$ 0,00"
                aria-label="Preço rápido em reais"
                className="h-9 w-24 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="h-9 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white active:scale-95"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setQuickPriceItem(null)}
                aria-label="Fechar captura rápida de preço"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Content (extra bottom padding for Thumb-Zone Dock + List Tabs) */}
      <main className="mx-auto max-w-2xl px-3 pb-44 pt-3.5 sm:px-4">
        {pwaInstall.canShowBanner && (
          <PwaInstallBanner
            isIosManualInstall={pwaInstall.isIosManualInstall}
            onInstall={() => void pwaInstall.promptInstall()}
            onDismiss={pwaInstall.dismissInstall}
          />
        )}

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
        ) : isLoadingList ? (
          <div className="space-y-3" aria-label="Carregando lista...">
            {[0, 1, 2].map((skeletonIdx) => (
              <div
                key={skeletonIdx}
                className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/70"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900">
                  <div className="h-3.5 w-28 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
                  <div className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingCount === 0 && checkedItems.length === 0 ? (
          <div className="animate-fade-slide-up mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/70 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
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
              {isSpeechRecognitionSupported() ? (
                <button
                  type="button"
                  onClick={() => quickAddBarRef.current?.triggerVoice()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 ring-1 ring-zinc-200/80 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-500/40 active:scale-95 dark:bg-zinc-800 dark:ring-zinc-700/80 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
                >
                  <Mic className="h-3.5 w-3.5 text-emerald-500" />
                  Fale os itens no microfone
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => quickAddBarRef.current?.triggerPaste()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-2 ring-1 ring-zinc-200/80 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-500/40 active:scale-95 dark:bg-zinc-800 dark:ring-zinc-700/80 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 text-emerald-500" />
                  Colar lista do WhatsApp
                </button>
              )}
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
                  className="min-h-[36px] shrink-0 rounded-lg bg-emerald-600/15 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                >
                  OK
                </button>
              </div>
            )}

            {/* Quick Search + Aisle Pills + Collapse All Toolbar */}
            <ActiveListToolbar
              pendingCount={pendingCount}
              categories={toolbarCategories}
              searchQuery={listSearchQuery}
              onSearchChange={setListSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              allCollapsed={allCollapsed}
              onToggleAllCollapsed={handleToggleAllCollapsed}
              canComparePrices={isSupabaseConfigured && !pinnedStore && (pendingCount > 0 || checkedItems.length > 0)}
              onOpenPriceComparison={() => setPriceCompareOpen(true)}
            />

            {/* Pending Items Grouped by Aisle / Category */}
            {filteredGroups.length === 0 && pendingCount > 0 ? (
              <div className="mb-4 rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                Nenhum item pendente corresponde ao filtro atual.
              </div>
            ) : (
              filteredGroups.map(({ category, items }) => {
                const forceExpanded =
                  Boolean(listSearchQuery.trim()) || selectedCategory !== 'all';
                return (
                  <CategoryGroup
                    key={category.id}
                    category={category}
                    items={items}
                    expanded={forceExpanded ? true : !collapsedCategories.has(category.id)}
                    onToggleExpand={handleToggleCategoryExpand}
                    onToggle={handleToggleItem}
                    onIncrement={handleIncrementItem}
                    onDecrement={handleRowDecrement}
                    onOpenCategoryPicker={handleOpenCategoryPicker}
                    onDelete={handleDelete}
                  />
                );
              })
            )}

            {/* Celebratory Completion Summary Card when only checked items remain */}
            {pendingCount === 0 && checkedItems.length > 0 && activeList && (
              <ShoppingCompleteCard
                listName={activeList.name}
                checkedItems={checkedItems}
                onRestartAll={() => void handleRestartList()}
                onShowToast={(msg) => showToast(msg)}
              />
            )}

            {/* Checked ("No carrinho / Já tenho") Permanent Section */}
            <CheckedSection
              key={activeList?.id ?? 'no-list'}
              items={checkedItems}
              onToggle={handleToggleItem}
              onIncrement={handleIncrementItem}
              onDecrement={handleRowDecrement}
              onOpenCategoryPicker={handleOpenCategoryPicker}
              onDelete={handleDelete}
              onRestartAll={() => void handleRestartList()}
            />
          </>
        )}
      </main>

      {/* PWA Update Available Prompt */}
      <PwaUpdatePrompt />

      {/* Thumb-Zone Bottom Dock (Catalog Drawer + List Tabs + Qty Pills + Voice + Paste + Input) */}
      <QuickAddBar
        barRef={quickAddBarRef}
        lists={lists}
        activeList={activeList}
        onSelectList={selectList}
        onOpenCreateList={() => setCreateOpen(true)}
        onAddText={handleAddText}
        onIncrementItem={handleIncrementItem}
        onDecrementItem={handleCatalogDecrement}
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
            key={categoryPickerItem.id}
            item={categoryPickerItem}
            onSaveItem={(item, updates) => void handleSaveItemDetails(item, updates)}
            onDeleteItem={(item) => void handleDelete(item)}
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

        {priceCompareOpen && activeList && isSupabaseConfigured && (
          <PriceComparisonSheet
            open={priceCompareOpen}
            listId={activeList.id}
            listName={activeList.name}
            listType={activeList.type}
            pendingItems={pendingItems}
            checkedItems={checkedItems}
            activeShoppingStore={pinnedStore}
            onSelectShoppingStore={(s) => (s ? pinStore(s) : unpinStore())}
            onClose={() => setPriceCompareOpen(false)}
            onShowToast={(msg) => showToast(msg)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
