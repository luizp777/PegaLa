import { RotateCcw } from 'lucide-react';
import type { PinnedStoreSelection } from '../../shared/priceTypes';
import type { ShoppingItem } from '../types';

/**
 * Estado da notificação toast temporária exibida no topo da tela.
 */
export interface ToastState {
  /** Mensagem principal exibida ao usuário. */
  message: string;
  /** Item recém-excluído que pode ser restaurado pelo botão "Desfazer". */
  undoItem?: ShoppingItem;
  /** IDs recém-desmarcados ao recomeçar a lista (permite "Desfazer"). */
  undoRestart?: { listId: string; itemIds: string[] };
  /** Item recém-marcado elegível para captura rápida de preço na loja ativa. */
  priceItem?: ShoppingItem;
}

/**
 * Propriedades do componente {@link GlobalToastBar}.
 */
interface GlobalToastBarProps {
  /** Toast ativo no momento, ou `null` quando oculto. */
  toast: ToastState | null;
  /** Restaura o último item excluído. */
  onUndoDelete: () => void;
  /** Restaura os itens desmarcados ao recomeçar a lista. */
  onUndoRestart: () => void;
  /** Abre a captura rápida de preço para o item recém-marcado. */
  onOpenQuickPrice: (item: ShoppingItem) => void;
  /** Item selecionado para captura rápida de preço na loja fixada. */
  quickPriceItem: ShoppingItem | null;
  /** Estabelecimento fixado na lista ativa. */
  pinnedStore: PinnedStoreSelection | null;
  /** Valor digitado no input de preço rápido. */
  quickPriceValue: string;
  /** Indica se o envio do preço rápido está em andamento. */
  isSavingQuickPrice: boolean;
  /** Atualiza o valor digitado no input de preço rápido. */
  onQuickPriceValueChange: (value: string) => void;
  /** Envia o preço rápido para o Supabase. */
  onSubmitQuickPrice: (e: React.FormEvent) => void;
  /** Fecha a barra de captura rápida de preço. */
  onCloseQuickPrice: () => void;
}

/**
 * Camada global de notificações (toast com Desfazer / + Preço) e barra de captura rápida de preço,
 * renderizada acima dos modais (`z-[60]`).
 *
 * @param props - Propriedades da camada global de notificações e preço rápido.
 * @returns Elementos flutuantes de toast e formulário rápido de preço.
 */
export function GlobalToastBar({
  toast,
  onUndoDelete,
  onUndoRestart,
  onOpenQuickPrice,
  quickPriceItem,
  pinnedStore,
  quickPriceValue,
  isSavingQuickPrice,
  onQuickPriceValueChange,
  onSubmitQuickPrice,
  onCloseQuickPrice,
}: GlobalToastBarProps) {
  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-toast-in pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-zinc-800 dark:ring-1 dark:ring-zinc-700">
            <span>{toast.message}</span>
            {toast.undoItem && (
              <button
                type="button"
                onClick={onUndoDelete}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Desfazer
              </button>
            )}
            {toast.undoRestart && (
              <button
                type="button"
                onClick={onUndoRestart}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Desfazer
              </button>
            )}
            {toast.priceItem && (
              <button
                type="button"
                onClick={() => onOpenQuickPrice(toast.priceItem!)}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white active:scale-95"
              >
                + Preço
              </button>
            )}
          </div>
        </div>
      )}

      {quickPriceItem && pinnedStore && (
        <div className="fixed inset-x-0 top-16 z-[60] flex justify-center px-4">
          <form
            onSubmit={onSubmitQuickPrice}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCloseQuickPrice();
            }}
            className="flex w-full max-w-md items-center gap-2 rounded-2xl border border-emerald-500/30 bg-white p-2.5 shadow-xl dark:bg-zinc-900"
          >
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">
              {quickPriceItem.name} ({quickPriceItem.quantity} {quickPriceItem.unit || 'un'}) •{' '}
              {pinnedStore.name}:
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={quickPriceValue}
              onChange={(e) => onQuickPriceValueChange(e.target.value)}
              placeholder="R$ 0,00"
              aria-label="Preço rápido em reais"
              className="h-10 w-24 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={isSavingQuickPrice}
              className="h-10 shrink-0 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white active:scale-95 disabled:opacity-50"
            >
              {isSavingQuickPrice ? '...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={onCloseQuickPrice}
              aria-label="Fechar captura rápida de preço"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-semibold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ×
            </button>
          </form>
        </div>
      )}
    </>
  );
}
