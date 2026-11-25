import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Search, Sparkles, X, Zap } from 'lucide-react';
import type { CategoryId, ListType, ShoppingItem, UserDictionaryEntry } from '../types';
import { CATEGORIES, normalizeText } from '../lib/categories';
import { CATALOG_BY_CATEGORY } from '../lib/catalogPtBr';
import { formatQuantity } from '../lib/itemParser';
import { hapticLight } from '../lib/haptics';
import { CategoryIcon, ItemIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link QuickCatalogDrawer}.
 */
interface QuickCatalogDrawerProps {
  /** Controla se o drawer do catálogo rápido está aberto. */
  open: boolean;
  /** Tipo da lista ativa, usado para priorizar abas de farmácia ou mercado. */
  listType: ListType;
  /** Itens mais frequentes do histórico pessoal do usuário. */
  frequentItems: UserDictionaryEntry[];
  /** Mapa de itens pendentes na lista ativa indexados pelo nome normalizado. */
  uncheckedByNormalizedName: Map<string, ShoppingItem>;
  /** Mapa de itens salvos em "No carrinho / Já tenho" indexados pelo nome normalizado. */
  checkedByNormalizedName: Map<string, ShoppingItem>;
  /** Adiciona um novo item (ou reativa um item salvo em "Já tenho") na lista. */
  onAddNew: (term: string) => void;
  /** Incrementa a quantidade de um item que já está na lista preservando sua unidade. */
  onIncrement: (item: ShoppingItem) => void;
  /** Decrementa ou move para "Já tenho" diretamente pelo botão `-` do chip. */
  onDecrement: (item: ShoppingItem) => void;
  /** Fecha o drawer do catálogo rápido. */
  onClose: () => void;
}

/**
 * Aba selecionável no catálogo rápido (`recentes` ou identificador de corredor).
 */
type CatalogTab = 'recentes' | Exclude<CategoryId, 'outros'>;

const PHARMACY_FIRST_TABS: Exclude<CategoryId, 'outros'>[] = [
  'medicamentos',
  'dermocosmeticos',
  'primeiros_socorros',
  'higiene',
  'bebe',
  'pet',
  'bebidas',
  'utilidades',
  'hortifruti',
  'padaria',
  'laticinios',
  'acougue',
  'mercearia',
  'congelados',
  'limpeza',
];

const MARKET_FIRST_TABS: Exclude<CategoryId, 'outros'>[] = [
  'hortifruti',
  'laticinios',
  'padaria',
  'acougue',
  'mercearia',
  'bebidas',
  'congelados',
  'limpeza',
  'utilidades',
  'higiene',
  'dermocosmeticos',
  'medicamentos',
  'primeiros_socorros',
  'bebe',
  'pet',
];

/**
 * Painel expansível na zona do polegar com busca instantânea em todo o catálogo,
 * abas acessíveis por corredor e toque múltiplo acumulativo (`1x`, `2x`, `3x`...) sem abrir o teclado principal.
 *
 * @param props - Propriedades do drawer de catálogo rápido.
 * @returns Painel renderizado ou `null` quando fechado.
 */
export function QuickCatalogDrawer({
  open,
  listType,
  frequentItems,
  uncheckedByNormalizedName,
  checkedByNormalizedName,
  onAddNew,
  onIncrement,
  onDecrement,
  onClose,
}: QuickCatalogDrawerProps) {
  const [activeTab, setActiveTab] = useState<CatalogTab>('recentes');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const orderedCategoryTabs = useMemo(
    () => (listType === 'farmacia' ? PHARMACY_FIRST_TABS : MARKET_FIRST_TABS),
    [listType]
  );

  const displayedItems = useMemo(() => {
    const normQuery = normalizeText(searchQuery);

    // Instant global search across all 15 corridors when user types inside drawer
    if (normQuery.length >= 2) {
      const seen = new Set<string>();
      const matches: Array<{ term: string; normalized: string; categoryId: CategoryId }> = [];

      for (const entry of frequentItems) {
        if (entry.normalizedTerm.includes(normQuery) && !seen.has(entry.normalizedTerm)) {
          seen.add(entry.normalizedTerm);
          matches.push({
            term: entry.displayName,
            normalized: entry.normalizedTerm,
            categoryId: entry.categoryId,
          });
        }
      }

      for (const catId of orderedCategoryTabs) {
        for (const term of CATALOG_BY_CATEGORY[catId]) {
          const norm = normalizeText(term);
          if (norm.includes(normQuery) && !seen.has(norm)) {
            seen.add(norm);
            matches.push({ term, normalized: norm, categoryId: catId });
          }
          if (matches.length >= 40) break;
        }
        if (matches.length >= 40) break;
      }

      return matches;
    }

    if (activeTab === 'recentes') {
      const seen = new Set<string>();
      const list: Array<{ term: string; normalized: string; categoryId: CategoryId }> = [];

      for (const entry of frequentItems) {
        if (!seen.has(entry.normalizedTerm)) {
          seen.add(entry.normalizedTerm);
          list.push({
            term: entry.displayName,
            normalized: entry.normalizedTerm,
            categoryId: entry.categoryId,
          });
        }
        if (list.length >= 16) break;
      }

      const fallbackCats: Array<Exclude<CategoryId, 'outros'>> =
        listType === 'farmacia'
          ? ['medicamentos', 'primeiros_socorros', 'dermocosmeticos', 'higiene']
          : ['hortifruti', 'laticinios', 'padaria', 'mercearia', 'limpeza'];

      for (const cat of fallbackCats) {
        for (const term of CATALOG_BY_CATEGORY[cat].slice(0, 5)) {
          const norm = normalizeText(term);
          if (!seen.has(norm)) {
            seen.add(norm);
            list.push({
              term,
              normalized: norm,
              categoryId: cat,
            });
          }
          if (list.length >= 24) break;
        }
        if (list.length >= 24) break;
      }

      return list;
    }

    return CATALOG_BY_CATEGORY[activeTab].map((term) => ({
      term,
      normalized: normalizeText(term),
      categoryId: activeTab as CategoryId,
    }));
  }, [activeTab, frequentItems, listType, orderedCategoryTabs, searchQuery]);

  if (!open) return null;

  return (
    <div className="animate-drawer-up mb-2.5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 px-3 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          <span>Catálogo Rápido</span>
          <span className="hidden font-normal text-zinc-400 sm:inline">· toque várias vezes para somar</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200/70 text-zinc-600 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300"
          aria-label="Fechar catálogo rápido"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Instant Search Bar inside Drawer */}
      <div className="border-b border-zinc-200/70 px-2.5 py-2 dark:border-zinc-800/80">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar no catálogo de mercado e farmácia..."
            aria-label="Buscar no catálogo"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-9 text-base text-zinc-800 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:h-9 sm:text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-0.5 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Limpar busca do catálogo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs (hidden while actively filtering globally) */}
      {normalizeText(searchQuery).length < 2 && (
        <div
          role="tablist"
          aria-label="Corredores do catálogo"
          className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-zinc-200/70 px-2.5 py-2 dark:border-zinc-800/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recentes'}
            onClick={() => {
              hapticLight();
              setActiveTab('recentes');
            }}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
              activeTab === 'recentes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Recentes</span>
          </button>
          {orderedCategoryTabs.map((catId) => {
            const cat = CATEGORIES.find((c) => c.id === catId)!;
            const isSelected = activeTab === catId;
            return (
              <button
                key={catId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  hapticLight();
                  setActiveTab(catId);
                }}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800'
                }`}
              >
                <CategoryIcon categoryId={catId} size="sm" inverted={isSelected} />
                <span>{cat.shortLabel ?? cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Multi-Tap Cumulative Chips Grid */}
      <div className="max-h-56 overflow-y-auto p-2.5">
        {displayedItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Nenhum item encontrado para "{searchQuery}". Use o campo abaixo para adicionar!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {displayedItems.map((entry) => {
              const activeItem = uncheckedByNormalizedName.get(entry.normalized);
              const checkedItem = !activeItem ? checkedByNormalizedName.get(entry.normalized) : undefined;
              const isInList = Boolean(activeItem);
              const isCheckedInList = Boolean(checkedItem);

              return (
                <div
                  key={entry.normalized}
                  className={`inline-flex min-h-[44px] items-center overflow-hidden rounded-2xl border transition ${
                    isInList
                      ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                      : isCheckedInList
                        ? 'border-dashed border-emerald-500/60 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100'
                  }`}
                >
                  {isInList && activeItem && (
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        onDecrement(activeItem);
                      }}
                      className="flex h-11 w-9 items-center justify-center border-r border-emerald-500/70 bg-emerald-700/60 text-white active:bg-emerald-800"
                      aria-label={`Diminuir ${entry.term}`}
                    >
                      <Minus className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      if (isInList && activeItem) {
                        onIncrement(activeItem);
                      } else {
                        onAddNew(entry.term);
                      }
                    }}
                    className="flex h-11 items-center gap-1.5 px-3 text-sm font-semibold active:opacity-80"
                  >
                    <ItemIcon
                      name={entry.term}
                      categoryId={entry.categoryId}
                      size="chip"
                      inverted={isInList}
                    />
                    <span>{entry.term}</span>
                    {isInList && activeItem ? (
                      <span className="ml-0.5 rounded-lg bg-white/20 px-1.5 py-0.5 text-xs font-extrabold">
                        {formatQuantity(activeItem.quantity, activeItem.unit)}
                      </span>
                    ) : isCheckedInList ? (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
