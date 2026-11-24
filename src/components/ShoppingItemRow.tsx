import { useRef, useState } from 'react';
import { Check, Minus, Plus, Tag, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '../types';
import { CATEGORY_MAP } from '../lib/dictionaryPtBr';
import { formatQuantity } from '../lib/itemParser';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import { isAtMinQuantity } from '../db/localDb';
import { ItemIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link ShoppingItemRow}.
 */
interface ShoppingItemRowProps {
  /** Item de compra exibido na linha. */
  item: ShoppingItem;
  /** Alterna o item entre pendente e "No carrinho". */
  onToggle: (item: ShoppingItem) => void;
  /** Incrementa a quantidade do item com o passo adequado à unidade. */
  onIncrement: (item: ShoppingItem) => void;
  /** Decrementa a quantidade ou remove o item se chegar a zero. */
  onDecrement: (item: ShoppingItem) => void;
  /** Abre o Bottom Sheet de escolha de corredor para este item. */
  onOpenCategoryPicker: (item: ShoppingItem) => void;
  /** Exclui o item (disparado via swipe à esquerda ou lixeira). */
  onDelete: (item: ShoppingItem) => void;
}

const SWIPE_THRESHOLD = 72;
const MAX_SWIPE = 112;

/**
 * Linha otimizada para touchscreen com gestos de swipe (direita = carrinho, esquerda = excluir),
 * stepper direto `- qtd +` e botão de troca rápida de corredor.
 *
 * @param props - Propriedades da linha de item.
 * @returns Elemento interativo do item na lista.
 */
export function ShoppingItemRow({
  item,
  onToggle,
  onIncrement,
  onDecrement,
  onOpenCategoryPicker,
  onDelete,
}: ShoppingItemRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const suppressClickRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeLockedRef.current = null;
    suppressClickRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!swipeLockedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipeLockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (swipeLockedRef.current === 'horizontal') {
      suppressClickRef.current = true;
      setIsSwiping(true);
      const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping) {
      if (offsetX >= SWIPE_THRESHOLD) {
        hapticSuccess();
        onToggle(item);
      } else if (offsetX <= -SWIPE_THRESHOLD) {
        hapticWarning();
        onDelete(item);
      }
    }
    setOffsetX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    swipeLockedRef.current = null;
  };

  const showRightAction = offsetX > 10;
  const showLeftAction = offsetX < -10;
  const atMin = isAtMinQuantity(item);

  return (
    <div className="relative overflow-hidden border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/70">
      {/* Swipe Reveal Backgrounds */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-between px-5 transition-colors ${
          showRightAction
            ? 'bg-emerald-500 text-white'
            : showLeftAction
              ? 'bg-red-500 text-white'
              : 'bg-transparent'
        }`}
        aria-hidden="true"
      >
        <div className={`flex items-center gap-1.5 text-xs font-bold ${showRightAction ? 'opacity-100' : 'opacity-0'}`}>
          <Check className="h-5 w-5 stroke-[2.5]" />
          <span>{item.isChecked ? 'Voltar' : 'No carrinho'}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold ${showLeftAction ? 'opacity-100' : 'opacity-0'}`}>
          <span>Excluir</span>
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Foreground Row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.stopPropagation();
            e.preventDefault();
            suppressClickRef.current = false;
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`group relative flex min-h-[58px] items-center gap-1.5 px-2.5 py-1.5 ${
          item.isChecked
            ? 'bg-zinc-50/90 dark:bg-zinc-950/70'
            : 'bg-white dark:bg-zinc-900'
        }`}
      >
        {/* Big One-Handed Check Target with Minimalist Product Icon */}
        <button
          type="button"
          onClick={() => {
            if (isSwiping) return;
            hapticSuccess();
            onToggle(item);
          }}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 pl-0.5 text-left active:opacity-75"
          aria-label={item.isChecked ? `Comprar ${item.name} novamente` : `Marcar ${item.name} como pego`}
        >
          <ItemIcon
            name={item.name}
            categoryId={item.categoryId}
            isChecked={item.isChecked}
            size="row"
          />

          <span
            className={`line-clamp-2 text-[15px] font-medium leading-tight ${
              item.isChecked
                ? 'text-zinc-400 line-through dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {item.name}
          </span>
        </button>

        {/* Right Controls: Direct 44px Stepper + Category Sheet Trigger + Desktop Hover Delete */}
        {!item.isChecked ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Desktop hover delete button (mobile uses left swipe) */}
            <button
              type="button"
              onClick={() => {
                hapticWarning();
                onDelete(item);
              }}
              className="hidden h-10 w-9 items-center justify-center rounded-xl text-zinc-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100 active:scale-95 dark:hover:bg-red-950/40 sm:flex"
              aria-label={`Remover ${item.name}`}
              title={`Remover ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Category Picker Trigger */}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenCategoryPicker(item);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
              aria-label={`Trocar corredor de ${item.name}`}
              title={`Corredor: ${CATEGORY_MAP[item.categoryId]?.label ?? 'Outros'}`}
            >
              <Tag className="h-4 w-4" />
            </button>

            {/* Direct Inline Touch Stepper (- qty +) */}
            <div className="flex items-center rounded-2xl bg-zinc-100 p-0.5 dark:bg-zinc-800/90">
              <button
                type="button"
                disabled={atMin}
                onClick={() => {
                  hapticLight();
                  onDecrement(item);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 transition active:scale-90 active:bg-zinc-200 disabled:opacity-30 dark:text-zinc-200 dark:active:bg-zinc-700"
                aria-label={`Diminuir quantidade de ${item.name}`}
              >
                <Minus className="h-4 w-4 stroke-[2.5]" />
              </button>
              <span className="min-w-[36px] px-0.5 text-center text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                {formatQuantity(item.quantity, item.unit)}
              </span>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onIncrement(item);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-emerald-700 transition active:scale-90 active:bg-emerald-100 dark:text-emerald-400 dark:active:bg-emerald-950"
                aria-label={`Aumentar quantidade de ${item.name}`}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              hapticWarning();
              onDelete(item);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500 active:scale-95 dark:hover:bg-red-950/40"
            aria-label={`Remover ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
