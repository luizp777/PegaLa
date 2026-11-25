import { Navigation } from 'lucide-react';
import { formatBRL } from '../../lib/formatters';
import { hapticLight } from '../../lib/haptics';
import { buildNavigationUrl } from '../../lib/navigationLink';
import type { PriceComparisonResult } from '../../lib/priceEngine';

/**
 * Propriedades do componente {@link SplitPurchaseTab}.
 */
interface SplitPurchaseTabProps {
  /** Sugestão ótima de divisão em 2 lojas, ou `null` quando não há economia relevante. */
  bestSplit: PriceComparisonResult['bestSplit'];
}

/**
 * Aba "Dividir em 2 lojas" do comparador de preços, exibindo economia combinada,
 * itens por estabelecimento, distância e atalho direto de navegação.
 *
 * @param props - Propriedades da aba de divisão em duas lojas.
 * @returns Painel de comparação dividida renderizado.
 */
export function SplitPurchaseTab({ bestSplit }: SplitPurchaseTabProps) {
  return (
    <div
      role="tabpanel"
      aria-label="Dividir compra em 2 lojas"
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {bestSplit ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                Economia extra de {formatBRL(bestSplit.savingsCents)} (
                {Math.round(bestSplit.savingsRatio * 100)}%)
              </p>
              <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                Total combinado: {formatBRL(bestSplit.totalCents)}
              </p>
            </div>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              { index: 1, store: bestSplit.storeA, items: bestSplit.itemsA },
              { index: 2, store: bestSplit.storeB, items: bestSplit.itemsB },
            ].map(({ index, store, items }) => {
              const nav = buildNavigationUrl(store);
              return (
                <div key={store.id} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        {index}. {store.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {store.distanceKm} km • {items.length}{' '}
                        {items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <a
                      href={nav.href}
                      target={nav.externalTab ? '_blank' : undefined}
                      rel={nav.externalTab ? 'noopener noreferrer' : undefined}
                      onClick={() => hapticLight()}
                      aria-label={`Abrir rota para ${store.name}`}
                      className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-lg bg-emerald-600/15 px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600/25 dark:text-emerald-300"
                    >
                      <Navigation className="h-3 w-3" />
                      Rota
                    </a>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {items.map((m) => (
                      <li key={m.item.id} className="flex justify-between gap-2">
                        <span className="truncate">{m.item.name}</span>
                        <span className="shrink-0 font-bold">{formatBRL(m.effectiveTotalCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Dividir a compra em duas lojas não gera economia relevante (mínimo R$ 10,00 e 8%) em relação à melhor loja única.
        </p>
      )}
    </div>
  );
}
