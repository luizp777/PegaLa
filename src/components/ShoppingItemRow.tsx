import { memo, useRef } from 'react';
import { Check, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ShoppingItem } from '../types';
import { CATEGORY_MAP } from '../lib/categories';
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
 * Linha otimizada para touchscreen com gestos de swipe com feedback háptico no limiar
 * (direita = carrinho, esquerda = excluir), stepper direto `- qtd +`, exibição de quantidade
 * em itens marcados e botão de edição completa/troca de corredor.
 *
 * @remarks
 * Utiliza refs síncronas para leitura confiável de deslocamento no `touchend` e limpeza segura
 * da supressão de clique no `touchcancel`.
 *
 * @param props - Propriedades da linha de item.
 * @returns Elemento interativo do item na lista.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  onToggle,
  onIncrement,
  onDecrement,
  onOpenCategoryPicker,
  onDelete,
}: ShoppingItemRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const rightActionRef = useRef<HTMLDivElement>(null);
  const leftActionRef = useRef<HTMLDivElement>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const suppressClickRef = useRef(false);
  const thresholdHitRef = useRef(false);
  const offsetXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const applySwipeStyles = (clamped: number, swiping: boolean) => {
    const rowEl = rowRef.current;
    if (rowEl) {
      rowEl.style.transition = swiping ? 'none' : 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      rowEl.style.transform = clamped === 0 ? '' : `translateX(${clamped}px)`;
    }

    const showRight = clamped > 10;
    const showLeft = clamped < -10;
    const bgEl = bgRef.current;
    if (bgEl) {
      bgEl.classList.toggle('bg-emerald-500', showRight);
      bgEl.classList.toggle('bg-red-500', showLeft);
      bgEl.classList.toggle('text-white', showRight || showLeft);
      bgEl.classList.toggle('bg-transparent', !showRight && !showLeft);
    }

    const rightEl = rightActionRef.current;
    if (rightEl) {
      rightEl.classList.toggle('opacity-100', showRight);
      rightEl.classList.toggle('opacity-0', !showRight);
      rightEl.classList.toggle('scale-110', clamped >= SWIPE_THRESHOLD);
    }

    const leftEl = leftActionRef.current;
    if (leftEl) {
      leftEl.classList.toggle('opacity-100', showLeft);
      leftEl.classList.toggle('opacity-0', !showLeft);
      leftEl.classList.toggle('scale-110', clamped <= -SWIPE_THRESHOLD);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeLockedRef.current = null;
    suppressClickRef.current = false;
    thresholdHitRef.current = false;
    offsetXRef.current = 0;
    isSwipingRef.current = false;
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
      isSwipingRef.current = true;
      const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, dx));
      const crossed = Math.abs(clamped) >= SWIPE_THRESHOLD;
      if (crossed && !thresholdHitRef.current) {
        thresholdHitRef.current = true;
        hapticLight();
      } else if (!crossed && thresholdHitRef.current) {
        thresholdHitRef.current = false;
      }
      offsetXRef.current = clamped;
      applySwipeStyles(clamped, true);
    }
  };

  const resetSwipeGesture = (clearClickImmediately: boolean) => {
    offsetXRef.current = 0;
    isSwipingRef.current = false;
    applySwipeStyles(0, false);
    touchStartRef.current = null;
    swipeLockedRef.current = null;
    thresholdHitRef.current = false;
    if (clearClickImmediately) {
      suppressClickRef.current = false;
    } else if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handleTouchEnd = () => {
    if (isSwipingRef.current) {
      if (offsetXRef.current >= SWIPE_THRESHOLD) {
        hapticSuccess();
        onToggle(item);
      } else if (offsetXRef.current <= -SWIPE_THRESHOLD) {
        hapticWarning();
        onDelete(item);
      }
    }
    resetSwipeGesture(false);
  };

  const handleTouchCancel = () => {
    resetSwipeGesture(true);
  };

  const atMin = isAtMinQuantity(item);

  return (
    <div className="cv-row relative overflow-hidden border-b border-zinc-100 last:border-b-0 dark:border-zinc-800/70">
      {/* Swipe Reveal Backgrounds */}
      <div
        ref={bgRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-between bg-transparent px-5 transition-colors"
        aria-hidden="true"
      >
        <div ref={rightActionRef} className="flex items-center gap-1.5 text-xs font-bold opacity-0 transition-transform">
          <Check className="h-5 w-5 stroke-[2.5]" />
          <span>{item.isChecked ? 'Voltar' : 'No carrinho'}</span>
        </div>
        <div ref={leftActionRef} className="flex items-center gap-1.5 text-xs font-bold opacity-0 transition-transform">
          <span>Excluir</span>
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Foreground Row */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClickCapture={(e) => {
          if (suppressClickRef.current) {
            e.stopPropagation();
            e.preventDefault();
            suppressClickRef.current = false;
          }
        }}
        className={`group relative flex min-h-[58px] touch-pan-y items-center gap-1.5 px-2.5 py-1.5 ${
          item.isChecked
            ? 'bg-zinc-50/90 dark:bg-zinc-950/70'
            : 'bg-white dark:bg-zinc-900'
        }`}
      >
        {/* Big One-Handed Check Target with Minimalist Product Icon */}
        <button
          type="button"
          aria-pressed={item.isChecked}
          onClick={() => {
            if (isSwipingRef.current) return;
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
                ? 'text-zinc-500 line-through dark:text-zinc-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {item.name}
          </span>
        </button>

        {/* Right Controls: Direct 44px Stepper + Category Sheet Trigger + Desktop Hover Delete */}
        {!item.isChecked ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Desktop hover / tablet touch delete button (mobile uses left swipe) */}
            <button
              type="button"
              onClick={() => {
                hapticWarning();
                onDelete(item);
              }}
              className="hidden h-10 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 active:scale-95 dark:hover:bg-red-950/40 sm:flex [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
              aria-label={`Remover ${item.name}`}
              title={`Remover ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* Item & Category Editor Trigger */}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenCategoryPicker(item);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 active:scale-95 dark:hover:bg-zinc-800"
              aria-label={`Editar ${item.name} e corredor`}
              title={`Editar item · Corredor: ${CATEGORY_MAP[item.categoryId]?.label ?? 'Outros'}`}
            >
              <Pencil className="h-3.5 w-3.5" />
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
          <div className="flex shrink-0 items-center gap-1">
            <span className="rounded-lg bg-zinc-200/70 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {formatQuantity(item.quantity, item.unit)}
            </span>
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
          </div>
        )}
      </div>
    </div>
  );
});
