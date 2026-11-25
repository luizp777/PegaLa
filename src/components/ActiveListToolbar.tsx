import { ChevronsDownUp, ChevronsUpDown, Scale, Search, X } from 'lucide-react';
import type { CategoryDefinition, CategoryId } from '../types';
import { CategoryIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link ActiveListToolbar}.
 */
interface ActiveListToolbarProps {
  /** Quantidade total de itens pendentes na lista ativa. */
  pendingCount: number;
  /** Lista de corredores ativos com seus respectivos contadores de itens pendentes. */
  categories: Array<{ category: CategoryDefinition; count: number }>;
  /** Termo atual da busca rápida na lista ativa. */
  searchQuery: string;
  /** Atualiza o termo da busca rápida. */
  onSearchChange: (value: string) => void;
  /** Corredor selecionado no filtro (`'all'` para exibir todos). */
  selectedCategory: CategoryId | 'all';
  /** Atualiza o filtro de corredor ativo. */
  onSelectCategory: (categoryId: CategoryId | 'all') => void;
  /** Indica se todos os corredores visíveis estão atualmente recolhidos. */
  allCollapsed: boolean;
  /** Alterna entre recolher todos e expandir todos os corredores. */
  onToggleAllCollapsed: () => void;
  /** Indica se o comparador de preços está habilitado para esta lista. */
  canComparePrices?: boolean;
  /** Abre o comparador de preços em mercados e farmácias próximos. */
  onOpenPriceComparison?: () => void;
}

/**
 * Barra compacta de navegação rápida para listas maiores no mercado:
 * oferece busca instantânea (quando há 8+ itens pendentes), pílulas de atalho por corredor
 * e controle para recolher/expandir todos os corredores de uma vez.
 *
 * @param props - Propriedades da barra de filtragem da lista ativa.
 * @returns Barra renderizada ou `null` quando a lista é curta e possui apenas 1 corredor.
 */
export function ActiveListToolbar({
  pendingCount,
  categories,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  allCollapsed,
  onToggleAllCollapsed,
  canComparePrices = false,
  onOpenPriceComparison,
}: ActiveListToolbarProps) {
  const showSearch = pendingCount >= 8 || searchQuery.length > 0;
  const showCategoryPills = categories.length >= 2;

  if (!showSearch && !showCategoryPills && !canComparePrices) return null;

  return (
    <div className="mb-3 space-y-2">
      {canComparePrices && onOpenPriceComparison && (
        <div
          className={
            !showSearch && !showCategoryPills
              ? 'flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/60 px-3 py-2 dark:bg-emerald-950/30'
              : 'flex justify-end'
          }
        >
          {!showSearch && !showCategoryPills && (
            <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
              Onde essa lista fica mais barata?
            </span>
          )}
          <button
            type="button"
            onClick={onOpenPriceComparison}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
          >
            <Scale className="h-3.5 w-3.5" />
            Comparar preços
          </button>
        </div>
      )}
      {showSearch && (
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar itens da lista..."
            aria-label="Filtrar itens da lista"
            className="h-9 w-full rounded-xl border border-zinc-200/90 bg-white pl-8.5 pr-9 text-base text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 sm:text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Limpar filtro da lista"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {showCategoryPills && (
        <div className="flex items-center gap-1.5">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              aria-pressed={selectedCategory === 'all'}
              onClick={() => onSelectCategory('all')}
              className={`flex h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 text-xs font-bold transition active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200/80 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
              }`}
            >
              <span>Todos</span>
              <span
                className={`rounded-md px-1 text-[10px] font-extrabold ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {pendingCount}
              </span>
            </button>

            {categories.map(({ category, count }) => {
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectCategory(isSelected ? 'all' : category.id)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-zinc-600 ring-1 ring-zinc-200/80 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
                  }`}
                >
                  <CategoryIcon categoryId={category.id} size="sm" inverted={isSelected} />
                  <span>{category.shortLabel ?? category.label}</span>
                  <span
                    className={`rounded-md px-1 text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCategory === 'all' && !searchQuery && (
            <button
              type="button"
              onClick={onToggleAllCollapsed}
              title={allCollapsed ? 'Expandir todos os corredores' : 'Recolher todos os corredores'}
              aria-label={allCollapsed ? 'Expandir todos os corredores' : 'Recolher todos os corredores'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-500 ring-1 ring-zinc-200/80 transition hover:bg-zinc-100 active:scale-95 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800"
            >
              {allCollapsed ? (
                <ChevronsUpDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronsDownUp className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
