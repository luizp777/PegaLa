import { Check } from 'lucide-react';
import type { PriceQuoteCandidate } from '../../../shared/priceTypes';
import { formatBRL } from '../../lib/formatters';
import { hapticSuccess } from '../../lib/haptics';
import { formatQuantity } from '../../lib/itemParser';
import type { MatchedStoreItem } from '../../lib/priceEngine';
import type { ShoppingItem } from '../../types';

/**
 * Alvo ativo para edição ou registro manual de preço em uma loja específica.
 */
export interface PriceEditTarget {
  /** UUID da loja no Supabase. */
  storeId: string;
  /** Nome legível da loja. */
  storeName: string;
  /** Item da lista associado ao registro de preço. */
  item: ShoppingItem;
  /** Lista opcional de itens selecionáveis quando a loja não possui cotações. */
  selectableItems?: ShoppingItem[];
  /** Título opcional do produto específico encontrado na loja. */
  currentTitle?: string;
  /** Quantidade da embalagem informada. */
  packQuantity: number;
  /** Unidade da embalagem informada. */
  packUnit: string;
}

/**
 * Propriedades do componente {@link ProductSwapDock}.
 */
interface ProductSwapDockProps {
  /** Item pareado na loja com suas alternativas disponíveis. */
  swapTarget: MatchedStoreItem;
  /** Callback acionado ao escolher um produto alternativo preferido. */
  onSelectAlternative: (item: ShoppingItem, alt: PriceQuoteCandidate) => void;
  /** Fecha o dock de troca de produto. */
  onClose: () => void;
}

/**
 * Dock fixo na zona do polegar para trocar o produto/marca selecionado em um item da comparação.
 *
 * @param props - Propriedades do dock de troca de produto.
 * @returns Painel inferior de seleção de marca/produto.
 */
export function ProductSwapDock({
  swapTarget,
  onSelectAlternative,
  onClose,
}: ProductSwapDockProps) {
  return (
    <div className="border-t border-emerald-500/30 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
          Escolher produto para "{swapTarget.item.name}"
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[38px] rounded-lg px-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Fechar
        </button>
      </div>
      <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
        {swapTarget.alternatives.map((alt) => (
          <button
            key={alt.productKey}
            type="button"
            onClick={() => {
              hapticSuccess();
              onSelectAlternative(swapTarget.item, alt);
            }}
            className="flex min-h-[40px] w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-left text-xs hover:border-emerald-500 dark:border-zinc-700"
          >
            <span className="truncate pr-2 font-medium text-zinc-800 dark:text-zinc-100">
              {alt.productTitle}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-extrabold text-emerald-700 dark:text-emerald-400">
              {formatBRL(alt.priceCents)}
              {alt.productKey === swapTarget.candidate.productKey && <Check className="h-3.5 w-3.5" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Propriedades do componente {@link ManualPriceDock}.
 */
interface ManualPriceDockProps {
  /** Alvo da loja e item para registro colaborativo de preço. */
  target: PriceEditTarget;
  /** Valor digitado no campo de preço. */
  manualPriceInput: string;
  /** Indica se a submissão para a RPC está em andamento. */
  isSubmitting: boolean;
  /** Atualiza o alvo selecionado (ex.: ao trocar item em loja vazia). */
  onChangeTarget: (next: PriceEditTarget) => void;
  /** Atualiza o texto digitado no campo de preço. */
  onChangePriceInput: (value: string) => void;
  /** Submete o preço manual para a RPC `report_community_price`. */
  onSubmit: (e: React.FormEvent) => void;
  /** Cancela e fecha o dock de preço manual. */
  onCancel: () => void;
}

/**
 * Dock fixo na zona do polegar para informar ou corrigir um preço colaborativo em uma loja.
 *
 * @param props - Propriedades do dock de preço manual.
 * @returns Formulário inferior para envio de preço colaborativo.
 */
export function ManualPriceDock({
  target,
  manualPriceInput,
  isSubmitting,
  onChangeTarget,
  onChangePriceInput,
  onSubmit,
  onCancel,
}: ManualPriceDockProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-emerald-500/30 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
          Informar preço em {target.storeName}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[38px] rounded-lg px-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancelar
        </button>
      </div>
      {target.selectableItems && target.selectableItems.length > 1 ? (
        <div className="mt-1.5">
          <select
            aria-label="Selecionar item da lista"
            value={target.item.id}
            onChange={(e) => {
              const chosen = target.selectableItems?.find((i) => i.id === e.target.value);
              if (chosen) {
                onChangeTarget({
                  ...target,
                  item: chosen,
                  packQuantity: 1,
                  packUnit: chosen.unit || 'un',
                });
              }
            }}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            {target.selectableItems.map((it) => (
              <option key={it.id} value={it.id}>
                {it.name} ({formatQuantity(it.quantity, it.unit)})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Preço da embalagem ({formatQuantity(target.packQuantity, target.packUnit)}) — {target.item.name}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={manualPriceInput}
          onChange={(e) => onChangePriceInput(e.target.value)}
          placeholder="Ex.: 5,49"
          aria-label="Preço em reais"
          className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar preço'}
        </button>
      </div>
    </form>
  );
}
