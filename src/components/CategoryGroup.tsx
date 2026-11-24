import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CategoryDefinition, ShoppingItem } from '../types';
import { CategoryIcon } from './ItemIcon';
import { ShoppingItemRow } from './ShoppingItemRow';

/**
 * Propriedades do componente {@link CategoryGroup}.
 */
interface CategoryGroupProps {
  /** Definição visual e de ordenação do corredor/categoria. */
  category: CategoryDefinition;
  /** Itens pendentes pertencentes a esta categoria. */
  items: ShoppingItem[];
  /** Alterna o estado de marcação ("No carrinho") de um item. */
  onToggle: (item: ShoppingItem) => void;
  /** Incrementa a quantidade de um item. */
  onIncrement: (item: ShoppingItem) => void;
  /** Decrementa a quantidade ou remove um item. */
  onDecrement: (item: ShoppingItem) => void;
  /** Abre o Bottom Sheet para editar detalhes e corredor de um item. */
  onOpenCategoryPicker: (item: ShoppingItem) => void;
  /** Exclui um item da lista. */
  onDelete: (item: ShoppingItem) => void;
}

/**
 * Agrupa visualmente os itens pendentes de um mesmo corredor com ícone vetorial minimalista,
 * título, contador e cabeçalho recolhível para compras longas.
 *
 * @param props - Propriedades do grupo de categoria.
 * @returns Seção renderizada com a lista de itens do corredor.
 */
export function CategoryGroup({
  category,
  items,
  onToggle,
  onIncrement,
  onDecrement,
  onOpenCategoryPicker,
  onDelete,
}: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-3.5 py-2 text-left transition hover:bg-zinc-100/70 dark:border-zinc-800/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/70"
      >
        <h2 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${category.colorClass}`}>
          <CategoryIcon categoryId={category.id} size="sm" />
          <span>{category.label}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {items.length}
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
          />
        </div>
      </button>
      {expanded && (
        <div>
          {items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onOpenCategoryPicker={onOpenCategoryPicker}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
