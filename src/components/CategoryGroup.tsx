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
  /** Abre o Bottom Sheet para alterar o corredor de um item. */
  onOpenCategoryPicker: (item: ShoppingItem) => void;
  /** Exclui um item da lista. */
  onDelete: (item: ShoppingItem) => void;
}

/**
 * Agrupa visualmente os itens pendentes de um mesmo corredor com emoji, título e contador.
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
  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/70">
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-3.5 py-2 dark:border-zinc-800/80 dark:bg-zinc-900">
        <h2 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${category.colorClass}`}>
          <CategoryIcon categoryId={category.id} size="sm" />
          <span>{category.label}</span>
        </h2>
        <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {items.length}
        </span>
      </div>
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
    </section>
  );
}
