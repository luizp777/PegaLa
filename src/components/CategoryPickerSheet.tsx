import { useRef, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { CategoryId, ShoppingItem } from '../types';
import { CATEGORIES } from '../lib/categories';
import { getMinQuantityForUnit, getQuantityStep } from '../db/localDb';
import { formatQuantity } from '../lib/itemParser';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { CategoryIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link CategoryPickerSheet}.
 */
interface CategoryPickerSheetProps {
  /** Item sendo editado, ou `null` quando o Bottom Sheet está fechado. */
  item: ShoppingItem | null;
  /** Callback acionado ao salvar alterações de nome, quantidade, unidade e/ou corredor. */
  onSaveItem: (
    item: ShoppingItem,
    updates: { name: string; quantity: number; unit: string; categoryId: CategoryId }
  ) => void;
  /** Callback opcional para excluir o item diretamente pelo sheet de edição (acessível no mobile). */
  onDeleteItem?: (item: ShoppingItem) => void;
  /** Fecha o Bottom Sheet sem alterações. */
  onClose: () => void;
}

const QUICK_UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct'] as const;

/**
 * Bottom Sheet acessível (com focus trap e scroll-lock) para edição completa do item
 * (nome, quantidade, unidade e corredor), envio via `Enter`, exclusão direta no mobile
 * e reclassificação de corredor com 1 toque.
 *
 * @param props - Propriedades do painel de edição do item.
 * @returns Bottom Sheet renderizado ou `null` quando inativo.
 */
export function CategoryPickerSheet({
  item,
  onSaveItem,
  onDeleteItem,
  onClose,
}: CategoryPickerSheetProps) {
  const [name, setName] = useState(() => item?.name ?? '');
  const [quantity, setQuantity] = useState(() => item?.quantity ?? 1);
  const [unit, setUnit] = useState(() => item?.unit ?? 'un');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(
    () => item?.categoryId ?? 'outros'
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalAccessibility(Boolean(item), dialogRef, onClose);

  if (!item) return null;

  const hasTextOrQtyChanges =
    name.trim() !== item.name || quantity !== item.quantity || unit !== item.unit;

  const handleStep = (direction: 'inc' | 'dec') => {
    hapticLight();
    const step = getQuantityStep(unit, quantity, direction);
    const min = getMinQuantityForUnit(unit);
    setQuantity((prev) =>
      direction === 'inc'
        ? Number((prev + step).toFixed(2))
        : Math.max(min, Number((prev - step).toFixed(2)))
    );
  };

  const handleSave = (categoryOverride?: CategoryId) => {
    hapticSuccess();
    onSaveItem(item, {
      name: name.trim() || item.name,
      quantity,
      unit,
      categoryId: categoryOverride ?? selectedCategory,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${item.name}`}
        className="animate-drawer-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-safe shadow-2xl focus:outline-none dark:bg-zinc-900 sm:rounded-3xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle visual cue */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />

        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h2 className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
              Editar item
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ajuste nome, quantidade ou toque no corredor
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

        {/* Name + Quantity + Unit Controls (Enter submits) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mb-3.5 space-y-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nome do item"
            enterKeyHint="done"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base font-medium text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => handleStep('dec')}
                disabled={quantity <= getMinQuantityForUnit(unit)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 active:scale-90 disabled:opacity-30 dark:text-zinc-200"
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="min-w-[44px] px-1 text-center text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                {formatQuantity(quantity, unit)}
              </span>
              <button
                type="button"
                onClick={() => handleStep('inc')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 active:scale-90 dark:text-emerald-400"
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto">
              {QUICK_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setUnit(u);
                    const min = getMinQuantityForUnit(u);
                    if (quantity < min) setQuantity(min);
                  }}
                  aria-pressed={unit === u}
                  className={`h-8 shrink-0 rounded-lg px-2.5 text-xs font-bold transition active:scale-95 ${
                    unit === u
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Corridor Grid */}
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Corredor (1 toque salva)
        </div>
        <div className="grid max-h-[42vh] grid-cols-3 gap-2 overflow-y-auto pb-2">
          {CATEGORIES.map((cat) => {
            const isCurrent = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  handleSave(cat.id);
                }}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition active:scale-95 ${
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

        <div className="mt-2 flex items-center gap-2">
          {onDeleteItem && (
            <button
              type="button"
              onClick={() => {
                hapticWarning();
                onDeleteItem(item);
                onClose();
              }}
              className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50/70 px-3.5 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-95 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir item</span>
            </button>
          )}
          {hasTextOrQtyChanges && (
            <button
              type="button"
              onClick={() => handleSave()}
              className="h-11 flex-1 rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.99]"
            >
              Salvar alterações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
