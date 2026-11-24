import { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid, List, RotateCcw, Search, ShoppingCart, X } from 'lucide-react';
import type { ShoppingItem } from '../types';
import { normalizeText } from '../lib/dictionaryPtBr';
import { hapticSuccess } from '../lib/haptics';
import { ItemIcon } from './ItemIcon';
import { ShoppingItemRow } from './ShoppingItemRow';

/**
 * Propriedades do componente {@link CheckedSection}.
 */
interface CheckedSectionProps {
  /** Itens já marcados como comprados ("No carrinho / Já tenho"). */
  items: ShoppingItem[];
  /** Desmarca um item devolvendo-o para a seção ativa de compras. */
  onToggle: (item: ShoppingItem) => void;
  /** Incrementa a quantidade do item. */
  onIncrement: (item: ShoppingItem) => void;
  /** Decrementa a quantidade do item. */
  onDecrement: (item: ShoppingItem) => void;
  /** Abre o seletor de categoria para o item. */
  onOpenCategoryPicker: (item: ShoppingItem) => void;
  /** Exclui definitivamente um item da lista. */
  onDelete: (item: ShoppingItem) => void;
  /** Devolve todos os itens marcados de volta para compra ativa sem apagar nenhum item salvo. */
  onRestartAll: () => void;
}

const VIEW_MODE_KEY = 'pegala_checked_view';

/**
 * Seção permanente e recolhível "No carrinho / Já tenho" exibida ao final da lista.
 * Oferece alternância persistida entre modo Lista e Grade compacta de reativação, além de filtro rápido
 * quando a casa acumula 8 ou mais itens salvos.
 *
 * @param props - Propriedades da seção de itens comprados/em casa.
 * @returns Seção renderizada ou `null` quando não há itens marcados.
 */
export function CheckedSection({
  items,
  onToggle,
  onIncrement,
  onDecrement,
  onOpenCategoryPicker,
  onDelete,
  onRestartAll,
}: CheckedSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });
  const [filterText, setFilterText] = useState('');

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 'list' ? 'grid' : 'list';
      try {
        localStorage.setItem(VIEW_MODE_KEY, next);
      } catch {
        // Ignora erro de armazenamento
      }
      return next;
    });
  };

  const filteredItems = useMemo(() => {
    const query = normalizeText(filterText);
    if (!query) return items;
    return items.filter((item) => item.normalizedName.includes(query));
  }, [items, filterText]);

  if (items.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-100/70 dark:border-zinc-800/70 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-h-[36px] min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          <ShoppingCart className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate">No carrinho / Já tenho ({items.length})</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {expanded && (
            <button
              type="button"
              onClick={handleToggleViewMode}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/70 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label={viewMode === 'list' ? 'Ver em grade compacta' : 'Ver em lista detalhada'}
              title={viewMode === 'list' ? 'Modo grade compacta' : 'Modo lista'}
            >
              {viewMode === 'list' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onRestartAll}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 active:scale-95 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            title="Devolver todos os itens para a lista de compra ativa"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Recomeçar</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-200/60 bg-zinc-50/70 dark:border-zinc-800/60 dark:bg-zinc-950/50">
          {(items.length >= 8 || filterText.length > 0) && (
            <div className="border-b border-zinc-200/60 px-3 py-2 dark:border-zinc-800/60">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtrar itens salvos..."
                  aria-label="Filtrar itens salvos"
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-9 text-base text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 sm:text-xs"
                />
                {filterText && (
                  <button
                    type="button"
                    onClick={() => setFilterText('')}
                    className="absolute right-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Limpar filtro"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="px-4 py-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Nenhum item salvo corresponde a "{filterText}".
            </div>
          ) : viewMode === 'grid' ? (
            <div className="flex flex-wrap gap-2 p-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    hapticSuccess();
                    onToggle(item);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-emerald-400 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                  title={`Toque para comprar "${item.name}" novamente`}
                >
                  <ItemIcon name={item.name} categoryId={item.categoryId} size="chip" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          ) : (
            filteredItems.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={onToggle}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onOpenCategoryPicker={onOpenCategoryPicker}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
