import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { CategoryId, ShoppingItem } from '../types';
import { CATEGORIES } from '../lib/dictionaryPtBr';
import { hapticLight } from '../lib/haptics';
import { CategoryIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link CategoryPickerSheet}.
 */
interface CategoryPickerSheetProps {
  /** Item sendo editado, ou `null` quando o Bottom Sheet está fechado. */
  item: ShoppingItem | null;
  /** Callback acionado ao escolher o novo corredor para o item. */
  onSelectCategory: (item: ShoppingItem, categoryId: CategoryId) => void;
  /** Fecha o Bottom Sheet sem alterações. */
  onClose: () => void;
}

/**
 * Bottom Sheet em grade de 3 colunas otimizado para touchscreen que permite reclassificar
 * o corredor de um item com 1 toque e ensinar a preferência ao dicionário local.
 *
 * @param props - Propriedades do seletor de categoria.
 * @returns Bottom Sheet renderizado ou `null` quando inativo.
 */
export function CategoryPickerSheet({
  item,
  onSelectCategory,
  onClose,
}: CategoryPickerSheetProps) {
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Corredor de ${item.name}`}
        className="w-full max-w-md rounded-t-3xl bg-white p-4 pb-safe shadow-2xl dark:bg-zinc-900 sm:rounded-3xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle visual cue */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

        <div className="mb-3.5 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h2 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
              Corredor de "{item.name}"
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              O PegaLá aprende sua escolha para as próximas compras
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto pb-2">
          {CATEGORIES.map((cat) => {
            const isCurrent = item.categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  hapticLight();
                  onSelectCategory(item, cat.id);
                  onClose();
                }}
                className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition active:scale-95 ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200'
                }`}
              >
                <CategoryIcon categoryId={cat.id} size="lg" />
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
