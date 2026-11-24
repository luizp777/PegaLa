import { Check, RotateCcw, Share2 } from 'lucide-react';
import type { ShoppingItem } from '../types';
import { buildShoppingSummaryText } from '../lib/pwaSummary';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { serializeError, uiLogger } from '../lib/logger';

/**
 * Propriedades do componente {@link ShoppingCompleteCard}.
 */
interface ShoppingCompleteCardProps {
  /** Nome da lista concluída. */
  listName: string;
  /** Itens marcados como pegos na compra atual. */
  checkedItems: ShoppingItem[];
  /** Reativa todos os itens pegos de volta para a próxima compra. */
  onRestartAll: () => void;
  /** Exibe uma notificação toast temporária após compartilhar/copiar o resumo. */
  onShowToast: (message: string) => void;
}

/**
 * Card celebratório minimalista exibido quando 100% dos itens pendentes da lista foram pegos,
 * destacando métricas da compra e atalhos para recomeçar ou compartilhar o resumo.
 *
 * @param props - Propriedades do card de conclusão de compra.
 * @returns Card renderizado.
 */
export function ShoppingCompleteCard({
  listName,
  checkedItems,
  onRestartAll,
  onShowToast,
}: ShoppingCompleteCardProps) {
  const totalItems = checkedItems.length;
  const aislesCount = new Set(checkedItems.map((i) => i.categoryId)).size;

  const handleShareSummary = async () => {
    hapticLight();
    const summaryText = buildShoppingSummaryText(listName, checkedItems);

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Resumo — ${listName}`,
          text: summaryText,
        });
        hapticSuccess();
        return;
      } catch (err) {
        // Ignora cancelamento pelo usuário e cai para cópia se for outro erro
        if (err instanceof Error && err.name === 'AbortError') return;
        uiLogger.debug('Web Share indisponível; tentando clipboard', serializeError(err));
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      hapticSuccess();
      onShowToast('Resumo da compra copiado!');
    } catch (err) {
      uiLogger.debug('Falha ao copiar resumo da compra', serializeError(err));
      onShowToast('Não foi possível compartilhar automaticamente.');
    }
  };

  return (
    <div className="animate-fade-slide-up mb-4 rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-50/90 to-white p-5 text-center shadow-xs dark:border-emerald-500/25 dark:from-emerald-950/45 dark:to-zinc-900/70">
      <div className="animate-check-pop mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
        <Check className="h-6 w-6 stroke-[2.75]" />
      </div>

      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
        Compra concluída!
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Todos os itens de <span className="font-semibold text-zinc-700 dark:text-zinc-200">{listName}</span> estão no carrinho.
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
          {totalItems} {totalItems === 1 ? 'item pego' : 'itens pegos'}
        </span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {aislesCount} {aislesCount === 1 ? 'corredor' : 'corredores'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onRestartAll}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-500 active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          Recomeçar lista
        </button>
        <button
          type="button"
          onClick={() => void handleShareSummary()}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Share2 className="h-4 w-4" />
          Compartilhar resumo
        </button>
      </div>
    </div>
  );
}
