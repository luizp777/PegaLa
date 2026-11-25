import { Navigation, Scale, Store, X } from 'lucide-react';
import type { PinnedStoreSelection } from '../../shared/priceTypes';
import type { PinnedStoreSummary } from '../hooks/usePinnedStore';
import { hapticLight } from '../lib/haptics';
import { buildNavigationUrl } from '../lib/navigationLink';

interface PinnedStoreBarProps {
  store: PinnedStoreSelection;
  summary: PinnedStoreSummary;
  onOpenComparator: () => void;
  onUnpin: () => void;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Barra compacta fixada abaixo do cabeçalho exibindo o estabelecimento escolhido,
 * total estimado em tempo real, subtotal "No carrinho" e botão 1-toque "Leve-me lá".
 */
export function PinnedStoreBar({
  store,
  summary,
  onOpenComparator,
  onUnpin,
}: PinnedStoreBarProps) {
  const nav = buildNavigationUrl(store);

  return (
    <div
      role="region"
      aria-label="Estabelecimento selecionado"
      className="border-t border-emerald-500/20 bg-emerald-50/90 px-3 py-2 backdrop-blur-md dark:border-emerald-500/20 dark:bg-emerald-950/60 sm:px-4"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <span className="truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
              {store.name}
            </span>
            {store.distanceKm > 0 && (
              <span className="shrink-0 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                • {store.distanceKm} km
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              Estimado: {formatBRL(summary.estimatedTotalCents)}
            </span>
            {summary.inCartTotalCents > 0 && (
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                • No carrinho: {formatBRL(summary.inCartTotalCents)}
              </span>
            )}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({summary.matchedCount}/{summary.totalItems} itens)
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <a
            href={nav.href}
            target={nav.externalTab ? '_blank' : undefined}
            rel={nav.externalTab ? 'noopener noreferrer' : undefined}
            onClick={() => hapticLight()}
            className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Leve-me lá</span>
          </a>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onOpenComparator();
            }}
            aria-label="Trocar estabelecimento"
            title="Trocar estabelecimento"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white/80 text-zinc-700 ring-1 ring-zinc-200/80 transition hover:bg-white active:scale-95 dark:bg-zinc-900/80 dark:text-zinc-300 dark:ring-zinc-700"
          >
            <Scale className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onUnpin();
            }}
            aria-label="Desafixar estabelecimento"
            title="Desafixar estabelecimento"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-200/60 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
