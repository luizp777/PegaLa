import { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Split,
  Store,
  Trophy,
  WifiOff,
  X,
} from 'lucide-react';
import { isPersistedStoreId } from '../../shared/priceTypes';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { usePriceComparison } from '../hooks/usePriceComparison';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import type { MatchedStoreItem } from '../lib/priceEngine';
import type { ListType, ShoppingItem } from '../types';

/**
 * Propriedades do componente {@link PriceComparisonSheet}.
 */
interface PriceComparisonSheetProps {
  /** Controla se a folha de comparação está aberta. */
  open: boolean;
  /** UUID da lista ativa. */
  listId: string;
  /** Nome legível da lista ativa. */
  listName: string;
  /** Tipo da lista (`mercado`, `farmacia` ou `geral`). */
  listType: ListType;
  /** Itens pendentes na lista. */
  pendingItems: ShoppingItem[];
  /** Itens já marcados ("No carrinho"). */
  checkedItems: ShoppingItem[];
  /** Loja selecionada na sessão como "Estou comprando aqui". */
  activeShoppingStore?: { id: string; name: string } | null;
  /** Atualiza a loja selecionada na sessão para captura rápida ao marcar itens. */
  onSelectShoppingStore?: (store: { id: string; name: string } | null) => void;
  /** Callback para fechar a folha. */
  onClose: () => void;
  /** Callback para exibir feedback toast no app. */
  onShowToast: (msg: string) => void;
}

function formatCepMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatSourceBadge(item: MatchedStoreItem): string {
  const diffMs = Math.max(0, Date.now() - Date.parse(item.observedAt));
  const diffDays = Math.floor(diffMs / 86400_000);
  const age = diffDays === 0 ? 'hoje' : `há ${diffDays}d`;
  return item.source === 'online' ? `Site • região • ${age}` : `Visto na loja • ${age}`;
}

/**
 * Bottom Sheet lazy-loaded para comparar os itens da lista com mercados e farmácias próximos.
 *
 * @param props - Propriedades do comparador de preços.
 * @returns Folha modal acessível ou `null` quando fechada.
 */
export function PriceComparisonSheet({
  open,
  listId,
  listName,
  listType,
  pendingItems,
  checkedItems,
  activeShoppingStore = null,
  onSelectShoppingStore,
  onClose,
  onShowToast,
}: PriceComparisonSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(open, panelRef, onClose);

  const {
    location,
    result,
    isLoadingStores,
    isStreamingQuotes,
    streamProgress,
    failedChains,
    error,
    isOfflineCache,
    cachedAt,
    includeChecked,
    setIncludeChecked,
    requestGpsAndCompare,
    searchByCepAndCompare,
    changeRadius,
    refreshComparison,
    selectPreferredProduct,
    reportManualPrice,
  } = usePriceComparison({ listId, listType, pendingItems, checkedItems });

  const [activeTab, setActiveTab] = useState<'single' | 'split'>('single');
  const [cepInput, setCepInput] = useState(() => formatCepMask(location?.cep ?? ''));
  const [editingLocation, setEditingLocation] = useState(!location);
  const [expandedStoreId, setExpandedStoreId] = useState<string | null | undefined>(undefined);
  const [showEmptyStores, setShowEmptyStores] = useState(false);

  // Estado para trocar produto/marca (dock fixo)
  const [swapTarget, setSwapTarget] = useState<MatchedStoreItem | null>(null);

  // Estado para informar/ajustar preço manual (dock fixo)
  const [priceEditTarget, setPriceEditTarget] = useState<{
    storeId: string;
    storeName: string;
    item: ShoppingItem;
    currentTitle?: string;
    packQuantity: number;
    packUnit: string;
  } | null>(null);
  const [manualPriceInput, setManualPriceInput] = useState('');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  if (!open) return null;

  const handleCepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    hapticLight();
    setEditingLocation(false);
    void searchByCepAndCompare(cepInput);
  };

  const handleSaveManualPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceEditTarget) return;
    const normalized = Number(manualPriceInput.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized < 0.1) {
      onShowToast('Informe um preço válido (ex.: 5,49).');
      return;
    }
    setIsSubmittingPrice(true);
    const res = await reportManualPrice({
      storeId: priceEditTarget.storeId,
      item: priceEditTarget.item,
      priceCents: Math.round(normalized * 100),
      productTitle: priceEditTarget.currentTitle,
      packQuantity: priceEditTarget.packQuantity,
      packUnit: priceEditTarget.packUnit,
    });
    setIsSubmittingPrice(false);
    if (res.ok) {
      hapticSuccess();
      onShowToast('Preço salvo e compartilhado com a região!');
      setPriceEditTarget(null);
      setManualPriceInput('');
    } else {
      onShowToast(res.error || 'Não foi possível salvar o preço.');
    }
  };

  const showNoStoresEmptyState =
    Boolean(location) &&
    !isLoadingStores &&
    !isStreamingQuotes &&
    !error &&
    result.rankedStores.length === 0 &&
    result.emptyStores.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-compare-title"
        tabIndex={-1}
        className="animate-fade-slide-up flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-zinc-50 shadow-2xl outline-none dark:bg-zinc-950 sm:rounded-3xl"
      >
        {/* Drag handle mobile */}
        <div className="flex justify-center bg-white pt-2.5 dark:bg-zinc-900 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0">
            <h2
              id="price-compare-title"
              className="truncate text-base font-extrabold text-zinc-900 dark:text-zinc-100"
            >
              Comparar preços • {listName}
            </h2>
            {location && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    if (!editingLocation && location?.cep) {
                      setCepInput(formatCepMask(location.cep));
                    }
                    setEditingLocation((v) => !v);
                  }}
                  className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {location.label}
                </button>
                {([1, 3, 5, 10] as const).map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => {
                      hapticLight();
                      void changeRadius(km);
                    }}
                    className={`min-h-[32px] rounded-lg px-2.5 text-xs font-bold transition active:scale-95 ${
                      location.radiusKm === km
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {km}km
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {location && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  void refreshComparison();
                }}
                disabled={isLoadingStores || isStreamingQuotes}
                aria-label="Atualizar comparação"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <RefreshCw className={`h-4 w-4 ${isStreamingQuotes ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar comparador"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
          {/* Localização / Onboarding */}
          {(editingLocation || !location) && (
            <div className="rounded-2xl border border-emerald-500/25 bg-white p-3.5 shadow-2xs dark:bg-zinc-900">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Use sua localização ou CEP para encontrar mercados e farmácias próximos:
              </p>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setEditingLocation(false);
                    void requestGpsAndCompare();
                  }}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white active:scale-95"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Usar GPS
                </button>
                <form onSubmit={handleCepSubmit} className="flex flex-1 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={9}
                    value={cepInput}
                    onChange={(e) => setCepInput(formatCepMask(e.target.value))}
                    placeholder="Ou digite o CEP (ex: 01310-100)"
                    aria-label="CEP"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-zinc-900 px-3.5 text-xs font-bold text-white active:scale-95 dark:bg-zinc-700"
                  >
                    Buscar
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Offline banner */}
          {isOfflineCache && cachedAt && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                Comparação offline • atualizada em{' '}
                {new Date(cachedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Escopo + Status streaming */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {checkedItems.length > 0 && (
              <label className="inline-flex min-h-[32px] cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeChecked}
                  onChange={(e) => {
                    hapticLight();
                    setIncludeChecked(e.target.checked);
                  }}
                  className="h-4 w-4 rounded accent-emerald-600"
                />
                Incluir "No carrinho" ({checkedItems.length})
              </label>
            )}
            <div aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">
              {(isLoadingStores || isStreamingQuotes) && (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isLoadingStores
                    ? 'Buscando lojas próximas...'
                    : `Consultando ${streamProgress.done} de ${streamProgress.total} redes...`}
                </span>
              )}
            </div>
          </div>

          {failedChains.length > 0 && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Indisponíveis agora: {failedChains.join(', ')}.
            </p>
          )}

          {/* Skeletons de carregamento inicial */}
          {isLoadingStores && result.rankedStores.length === 0 && (
            <div className="space-y-2" aria-label="Carregando lojas...">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
                    </div>
                    <div className="h-5 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado vazio acionável quando nenhuma loja é encontrada */}
          {showNoStoresEmptyState && location && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <Store className="mx-auto h-7 w-7 text-zinc-500 dark:text-zinc-400" />
              <p className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Nenhuma loja encontrada em {location.radiusKm} km
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Tente ampliar o raio de busca ou informar outro CEP.
              </p>
              <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                {location.radiusKm < 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      void changeRadius(10);
                    }}
                    className="h-10 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white active:scale-95"
                  >
                    Ampliar para 10 km
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setEditingLocation(true);
                  }}
                  className="h-10 rounded-xl bg-zinc-100 px-3.5 text-xs font-bold text-zinc-700 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Alterar CEP
                </button>
              </div>
            </div>
          )}

          {/* Abas: Por loja vs Dividir em 2 */}
          {result.rankedStores.length > 0 && (
            <div className="flex gap-1.5 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveTab('single');
                }}
                className={`min-h-[36px] flex-1 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === 'single'
                    ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Por loja ({result.rankedStores.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveTab('split');
                }}
                className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === 'split'
                    ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <Split className="h-3.5 w-3.5" />
                Dividir em 2 lojas
              </button>
            </div>
          )}

          {/* Aba 1: Ranking por loja única (vencedora unificada no card #1) */}
          {activeTab === 'single' && (
            <>
              <div className="space-y-2">
                {result.rankedStores.map((entry, idx) => {
                  const isWinner = idx === 0;
                  const isExpanded =
                    expandedStoreId === undefined ? isWinner : expandedStoreId === entry.store.id;
                  const isShoppingHere = activeShoppingStore?.id === entry.store.id;
                  const canContribute = isPersistedStoreId(entry.store.id);
                  return (
                    <div
                      key={entry.store.id}
                      className={`overflow-hidden rounded-2xl border ${
                        isWinner
                          ? 'border-emerald-500/45 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setExpandedStoreId(isExpanded ? null : entry.store.id);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
                      >
                        <div className="min-w-0">
                          {isWinner && (
                            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                              <Trophy className="h-3 w-3" />
                              Mais barata
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400">
                              #{idx + 1}
                            </span>
                            <span className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {entry.store.name}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {entry.store.distanceKm} km • {entry.matchedCount}/{entry.totalItems} itens
                            {entry.hasEstimatedMissing ? ' (inclui estimativa p/ faltantes)' : ''}
                          </p>
                          {isWinner && entry.savingsVsSecondCents > 0 && (
                            <p className="mt-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              Economia estimada de {formatBRL(entry.savingsVsSecondCents)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-extrabold ${
                              isWinner
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {formatBRL(entry.estimatedFullTotalCents)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-zinc-100 border-t border-zinc-200/70 bg-white px-3.5 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                          {onSelectShoppingStore && canContribute && (
                            <div className="flex items-center justify-between gap-2 py-2.5">
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {isShoppingHere
                                  ? 'Captura rápida + Preço ativada ao marcar itens'
                                  : 'Está comprando nesta loja agora?'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  hapticLight();
                                  onSelectShoppingStore(
                                    isShoppingHere
                                      ? null
                                      : { id: entry.store.id, name: entry.store.name }
                                  );
                                  onShowToast(
                                    isShoppingHere
                                      ? 'Modo loja física desativado.'
                                      : `Comprando em ${entry.store.name}: ao marcar um item você poderá informar o preço.`
                                  );
                                }}
                                className={`min-h-[32px] shrink-0 rounded-lg px-2.5 text-[11px] font-bold transition active:scale-95 ${
                                  isShoppingHere
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-100 text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-800 dark:text-zinc-300'
                                }`}
                              >
                                {isShoppingHere ? 'Comprando aqui ✓' : 'Estou comprando aqui'}
                              </button>
                            </div>
                          )}
                          {entry.matchedItems.map((m) => (
                            <div key={m.item.id} className="flex items-center justify-between gap-2 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-zinc-800 dark:text-zinc-100">
                                  {m.item.name} ({m.item.quantity} {m.item.unit})
                                </p>
                                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {m.candidate.productTitle}
                                  {m.packsNeeded > 1 ? ` • ${m.packsNeeded}x` : ''}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                    {formatSourceBadge(m)}
                                  </span>
                                  {m.isApproximateUnit && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                      Aproximado
                                    </span>
                                  )}
                                  {m.alternatives.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        hapticLight();
                                        setPriceEditTarget(null);
                                        setSwapTarget(m);
                                      }}
                                      className="inline-flex min-h-[32px] items-center rounded-lg bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 active:scale-95 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    >
                                      Trocar marca
                                    </button>
                                  )}
                                  {canContribute && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        hapticLight();
                                        setSwapTarget(null);
                                        setPriceEditTarget({
                                          storeId: entry.store.id,
                                          storeName: entry.store.name,
                                          item: m.item,
                                          currentTitle: m.candidate.productTitle,
                                          packQuantity: m.candidate.packQuantity,
                                          packUnit: m.candidate.packUnit,
                                        });
                                        setManualPriceInput((m.candidate.priceCents / 100).toFixed(2).replace('.', ','));
                                      }}
                                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-zinc-100 px-2.5 text-[11px] font-semibold text-zinc-700 active:scale-95 dark:bg-zinc-800 dark:text-zinc-300"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      Ajustar
                                    </button>
                                  )}
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                                {formatBRL(m.effectiveTotalCents)}
                              </span>
                            </div>
                          ))}

                          {entry.missingItems.map((missing) => (
                            <div
                              key={missing.id}
                              className="flex items-center justify-between gap-2 py-2 text-xs text-zinc-500 dark:text-zinc-400"
                            >
                              <span className="truncate">{missing.name} — não encontrado</span>
                              {canContribute && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    hapticLight();
                                    setSwapTarget(null);
                                    setPriceEditTarget({
                                      storeId: entry.store.id,
                                      storeName: entry.store.name,
                                      item: missing,
                                      packQuantity: 1,
                                      packUnit: missing.unit || 'un',
                                    });
                                    setManualPriceInput('');
                                  }}
                                  className="inline-flex min-h-[32px] shrink-0 items-center rounded-lg bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 active:scale-95 dark:bg-emerald-950/50 dark:text-emerald-300"
                                >
                                  + Preço
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Lojas sem preços ainda */}
              {result.emptyStores.length > 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setShowEmptyStores((v) => !v);
                    }}
                    className="flex min-h-[32px] w-full items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" />
                      {result.emptyStores.length} lojas próximas sem preços ainda — contribua
                    </span>
                    {showEmptyStores ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showEmptyStores && (
                    <ul className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {result.emptyStores.map((st) => (
                        <li key={st.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {st.name} ({st.distanceKm} km)
                          </span>
                          {pendingItems[0] && isPersistedStoreId(st.id) && (
                            <button
                              type="button"
                              onClick={() => {
                                hapticLight();
                                setSwapTarget(null);
                                setPriceEditTarget({
                                  storeId: st.id,
                                  storeName: st.name,
                                  item: pendingItems[0],
                                  packQuantity: 1,
                                  packUnit: pendingItems[0].unit || 'un',
                                });
                                setManualPriceInput('');
                              }}
                              className="inline-flex min-h-[32px] shrink-0 items-center rounded-lg bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            >
                              + Informar preço
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}

          {/* Aba 2: Melhor combinação em 2 lojas */}
          {activeTab === 'split' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {result.bestSplit ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        Economia extra de {formatBRL(result.bestSplit.savingsCents)} (
                        {Math.round(result.bestSplit.savingsRatio * 100)}%)
                      </p>
                      <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                        Total combinado: {formatBRL(result.bestSplit.totalCents)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                      <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        1. {result.bestSplit.storeA.name}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {result.bestSplit.itemsA.map((m) => (
                          <li key={m.item.id} className="flex justify-between gap-2">
                            <span className="truncate">{m.item.name}</span>
                            <span className="font-bold">{formatBRL(m.effectiveTotalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                      <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        2. {result.bestSplit.storeB.name}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {result.bestSplit.itemsB.map((m) => (
                          <li key={m.item.id} className="flex justify-between gap-2">
                            <span className="truncate">{m.item.name}</span>
                            <span className="font-bold">{formatBRL(m.effectiveTotalCents)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Dividir a compra em duas lojas não gera economia relevante (mínimo R$ 10,00 e 8%) em relação à melhor loja única.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dock fixo para troca de produto/marca (sempre visível na Thumb-Zone) */}
        {swapTarget && (
          <div className="border-t border-emerald-500/30 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                Escolher produto para "{swapTarget.item.name}"
              </p>
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                className="min-h-[32px] rounded-lg px-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                    void selectPreferredProduct(swapTarget.item, alt);
                    setSwapTarget(null);
                    onShowToast('Preferência salva para futuras comparações!');
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
        )}

        {/* Dock fixo para ajuste manual de preço (sempre visível na Thumb-Zone) */}
        {priceEditTarget && (
          <form
            onSubmit={(e) => void handleSaveManualPrice(e)}
            className="border-t border-emerald-500/30 bg-white px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                Informar preço em {priceEditTarget.storeName}
              </p>
              <button
                type="button"
                onClick={() => setPriceEditTarget(null)}
                className="min-h-[32px] rounded-lg px-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Preço da embalagem ({priceEditTarget.packQuantity} {priceEditTarget.packUnit}) —{' '}
              {priceEditTarget.item.name}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={manualPriceInput}
                onChange={(e) => setManualPriceInput(e.target.value)}
                placeholder="Ex.: 5,49"
                aria-label="Preço em reais"
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={isSubmittingPrice}
                className="h-11 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {isSubmittingPrice ? 'Salvando...' : 'Salvar preço'}
              </button>
            </div>
          </form>
        )}

        {/* Footer legal disclaimer com safe-area iOS */}
        <div className="border-t border-zinc-200/80 bg-white px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-center text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Preços estimados. Valores do site podem diferir da loja física.
        </div>
      </div>
    </div>
  );
}
