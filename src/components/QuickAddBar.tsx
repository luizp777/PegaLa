import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardPaste,
  LayoutGrid,
  Mic,
  MicOff,
  Plus,
  Sparkles,
} from 'lucide-react';
import { normalizeText, searchDictionary } from '../lib/dictionaryPtBr';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { useVoiceInput } from '../lib/speechParser';
import type { CategoryId, ShoppingItem, ShoppingList, UserDictionaryEntry } from '../types';
import { QuickCatalogDrawer } from './QuickCatalogDrawer';
import { ItemIcon, ListTypeIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link QuickAddBar}.
 */
interface QuickAddBarProps {
  /** Listas disponíveis para exibição nas abas inferiores da zona do polegar. */
  lists: ShoppingList[];
  /** Lista ativa no momento. */
  activeList: ShoppingList | null;
  /** Alterna a lista ativa pelo ID. */
  onSelectList: (id: string) => void;
  /** Abre o modal de criação de nova lista. */
  onOpenCreateList: () => void;
  /** Adiciona um ou mais itens a partir de texto digitado, colado ou ditado por voz. */
  onAddText: (rawText: string) => Promise<ShoppingItem[]>;
  /** Incrementa um item já existente na lista (usado pelo catálogo rápido). */
  onIncrementItem: (item: ShoppingItem) => void;
  /** Decrementa ou remove um item já existente na lista. */
  onDecrementItem: (item: ShoppingItem) => void;
  /** Aplica quantidade e unidade ao último item adicionado quando o campo está vazio. */
  onApplyQuickQtyToLastItem: (quantity: number, unit: string) => Promise<boolean>;
  /** Histórico pessoal de termos frequentes para autocomplete e catálogo rápido. */
  userHistory: UserDictionaryEntry[];
  /** Mapa de itens pendentes na lista ativa por nome normalizado. */
  uncheckedByNormalizedName: Map<string, ShoppingItem>;
  /** Mapa de itens salvos em "No carrinho / Já tenho" por nome normalizado. */
  checkedByNormalizedName: Map<string, ShoppingItem>;
  /** Exibe notificação toast temporária para o usuário. */
  onShowToast: (msg: string) => void;
}

const QUICK_QTY_PILLS: Array<{ label: string; prefix: string; qty: number; unit: string }> = [
  { label: '2x', prefix: '2 ', qty: 2, unit: 'un' },
  { label: '3x', prefix: '3 ', qty: 3, unit: 'un' },
  { label: '5x', prefix: '5 ', qty: 5, unit: 'un' },
  { label: '200g', prefix: '200g ', qty: 200, unit: 'g' },
  { label: '500g', prefix: '500g ', qty: 500, unit: 'g' },
  { label: '1kg', prefix: '1kg ', qty: 1, unit: 'kg' },
  { label: '1 cx', prefix: '1 cx ', qty: 1, unit: 'cx' },
  { label: '1 pct', prefix: '1 pct ', qty: 1, unit: 'pct' },
  { label: '1 L', prefix: '1 L ', qty: 1, unit: 'L' },
];

/**
 * Dock inferior fixo projetado para operação com uma mão (`Thumb-Zone`), reunindo:
 * catálogo rápido expansível, abas de listas, pílulas de quantidade/unidade, autocomplete,
 * botão de colagem de 1 toque e captura por voz em PT-BR.
 *
 * @param props - Propriedades da barra inferior de inclusão rápida.
 * @returns Dock inferior renderizado.
 */
export function QuickAddBar({
  lists,
  activeList,
  onSelectList,
  onOpenCreateList,
  onAddText,
  onIncrementItem,
  onDecrementItem,
  onApplyQuickQtyToLastItem,
  userHistory,
  uncheckedByNormalizedName,
  checkedByNormalizedName,
  onShowToast,
}: QuickAddBarProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const voice = useVoiceInput(
    async (normalizedText) => {
      if (!normalizedText) return;
      const added = await onAddText(normalizedText);
      if (added.length > 0) {
        hapticSuccess();
        onShowToast(
          added.length === 1
            ? `🎙️ "${added[0].name}" adicionado!`
            : `🎙️ ${added.length} itens adicionados por voz!`
        );
      }
    },
    (errorMsg) => onShowToast(errorMsg)
  );

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const suggestions = useMemo(() => {
    const norm = normalizeText(value);
    if (norm.length < 2) return [];

    // Strip leading quantity so typing "2 lei" still suggests "Leite integral"
    const cleanQuery = norm.replace(/^\d+\s*(un|kg|g|l|ml|cx|pct)?\s*/, '').trim();
    const lookup = cleanQuery.length >= 2 ? cleanQuery : norm;

    const seen = new Set<string>();
    const results: Array<{
      term: string;
      categoryId: CategoryId;
      fromHistory: boolean;
      isCheckedInList: boolean;
    }> = [];

    for (const h of userHistory) {
      if (h.normalizedTerm.includes(lookup) && !uncheckedByNormalizedName.has(h.normalizedTerm)) {
        seen.add(h.normalizedTerm);
        results.push({
          term: h.displayName,
          categoryId: h.categoryId,
          fromHistory: true,
          isCheckedInList: checkedByNormalizedName.has(h.normalizedTerm),
        });
      }
      if (results.length >= 4) break;
    }

    for (const d of searchDictionary(lookup, 6)) {
      const n = normalizeText(d.term);
      if (!seen.has(n) && !uncheckedByNormalizedName.has(n)) {
        seen.add(n);
        results.push({
          term: d.term,
          categoryId: d.categoryId,
          fromHistory: false,
          isCheckedInList: checkedByNormalizedName.has(n),
        });
      }
      if (results.length >= 6) break;
    }

    return results;
  }, [value, userHistory, uncheckedByNormalizedName, checkedByNormalizedName]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    hapticLight();
    setValue('');
    await onAddText(trimmed);
    inputRef.current?.focus();
  };

  const handleSuggestionPick = async (term: string) => {
    hapticLight();
    const qtyPrefixMatch = value.trim().match(/^(\d+(?:[.,]\d+)?\s*(?:un|kg|g|l|ml|cx|pct)?)\s+/i);
    const finalText = qtyPrefixMatch ? `${qtyPrefixMatch[1]} ${term}` : term;
    setValue('');
    await onAddText(finalText);
    inputRef.current?.focus();
  };

  const handleQuickQtyPill = async (pill: (typeof QUICK_QTY_PILLS)[number]) => {
    hapticLight();
    const trimmed = value.trim();
    if (!trimmed) {
      const applied = await onApplyQuickQtyToLastItem(pill.qty, pill.unit);
      if (!applied) {
        setValue(pill.prefix);
        inputRef.current?.focus();
      }
      return;
    }

    // Replace existing leading quantity (including standalone prefix like "2") or prepend new one
    const withoutLeadingQty = trimmed.replace(
      /^\d+(?:[.,]\d+)?\s*(?:x|un|kg|g|l|ml|cx|pct)?(?:\s+|$)/i,
      ''
    );
    setValue(`${pill.prefix}${withoutLeadingQty}`);
    inputRef.current?.focus();
  };

  const handleOneTapPaste = async () => {
    hapticLight();
    try {
      if (!navigator.clipboard?.readText) {
        onShowToast('Segure no campo de texto e toque em "Colar"');
        inputRef.current?.focus();
        return;
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!clipText) {
        onShowToast('Área de transferência vazia');
        return;
      }
      const added = await onAddText(clipText);
      if (added.length > 0) {
        hapticSuccess();
        onShowToast(
          added.length === 1
            ? `📋 "${added[0].name}" colado!`
            : `📋 ${added.length} itens colados da lista!`
        );
      }
    } catch {
      onShowToast('Permita acesso à área de transferência ou cole no campo');
      inputRef.current?.focus();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && (/[\r\n]/.test(pasted) || pasted.includes(';'))) {
      e.preventDefault();
      setValue('');
      const added = await onAddText(pasted);
      if (added.length > 0) hapticSuccess();
    }
  };

  return (
    <>
      {catalogOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/15"
          onClick={() => setCatalogOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/90 bg-white/95 backdrop-blur-md pb-safe dark:border-zinc-800/90 dark:bg-zinc-950/95">
        <div className="mx-auto max-w-2xl px-3 pt-2 sm:px-4">
          {/* Expandable Thumb-Zone Quick Catalog Drawer */}
          {activeList && (
            <QuickCatalogDrawer
              open={catalogOpen}
              listType={activeList.type}
              frequentItems={userHistory}
              uncheckedByNormalizedName={uncheckedByNormalizedName}
              checkedByNormalizedName={checkedByNormalizedName}
              onAddNew={(term) => void onAddText(term)}
              onIncrement={onIncrementItem}
              onDecrement={onDecrementItem}
              onClose={() => setCatalogOpen(false)}
            />
          )}

        {/* Voice Listening Indicator */}
        {voice.isListening && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {voice.interimText ? `"${voice.interimText}"` : 'Ouvindo... fale ex: "2 leites e 1 caixa de dipirona"'}
            </span>
            <button
              type="button"
              onClick={voice.stopListening}
              className="rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white"
            >
              Parar
            </button>
          </div>
        )}

        {/* Live Autocomplete Bar (when typing) */}
        {isFocused && suggestions.length > 0 && (
          <div className="no-scrollbar mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {suggestions.map((s) => (
              <button
                key={s.term}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  void handleSuggestionPick(s.term);
                }}
                className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-sm font-medium text-zinc-800 transition hover:border-emerald-400 hover:bg-emerald-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/50"
              >
                <ItemIcon name={s.term} categoryId={s.categoryId} size="chip" />
                <span>{s.term}</span>
                {s.isCheckedInList ? (
                  <span
                    className="inline-flex items-center rounded-full bg-emerald-500/15 p-0.5 text-emerald-600 dark:text-emerald-400"
                    title="Já salvo na lista"
                  >
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </span>
                ) : (
                  s.fromHistory && <Sparkles className="h-3 w-3 text-emerald-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quick Quantity / Unit Pills (when input is focused) */}
        {isFocused && (
          <div className="no-scrollbar mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {QUICK_QTY_PILLS.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  void handleQuickQtyPill(pill);
                }}
                className="flex h-9 shrink-0 items-center rounded-xl border border-zinc-200 bg-zinc-100 px-3 text-xs font-bold text-zinc-700 transition active:scale-95 active:bg-emerald-600 active:text-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {pill.label}
              </button>
            ))}
          </div>
        )}

        {/* Thumb-Zone List Switcher Tabs (when keyboard & catalog are closed) */}
        {!isFocused && !catalogOpen && lists.length > 0 && (
          <div className="no-scrollbar mb-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {lists.map((list) => {
              const isCurrent = list.id === activeList?.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onSelectList(list.id);
                  }}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ListTypeIcon type={list.type} className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[110px] truncate">{list.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenCreateList();
              }}
              aria-label="Criar nova lista"
              className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-dashed border-zinc-300 px-2.5 text-xs font-semibold text-zinc-500 active:scale-95 dark:border-zinc-700 dark:text-zinc-400"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova</span>
            </button>
          </div>
        )}

        {/* Main Thumb-Zone Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          {/* Toggle Quick Catalog Drawer */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setCatalogOpen((o) => !o);
              if (!catalogOpen) inputRef.current?.blur();
            }}
            aria-label="Abrir catálogo rápido"
            title="Catálogo rápido por corredor e recentes"
            className={`flex h-12 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
              catalogOpen
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
          </button>

          <input
            ref={inputRef}
            id="quick-add-input"
            name="quickAdd"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
              setCatalogOpen(false);
              setIsFocused(true);
            }}
            onBlur={() => {
              blurTimerRef.current = setTimeout(() => setIsFocused(false), 120);
            }}
            onPaste={handlePaste}
            placeholder="Adicionar item..."
            enterKeyHint="done"
            autoComplete="off"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-zinc-50 px-3.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500 dark:focus:bg-zinc-900"
          />

          {/* 1-Tap Paste Button (when input is empty) */}
          {!value.trim() && (
            <button
              type="button"
              onClick={() => void handleOneTapPaste()}
              aria-label="Colar lista do WhatsApp"
              title="Colar lista da área de transferência"
              className="flex h-12 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-zinc-700 transition active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <ClipboardPaste className="h-5 w-5" />
            </button>
          )}

          {/* Voice Input Button (when input is empty & supported) OR Submit "+" Button */}
          {!value.trim() && voice.isSupported ? (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                voice.toggleListening();
              }}
              aria-label={voice.isListening ? 'Parar gravação de voz' : 'Adicionar por voz'}
              title="Falar itens para adicionar"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition active:scale-95 ${
                voice.isListening
                  ? 'animate-pulse bg-red-600 text-white'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {voice.isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim()}
              aria-label="Adicionar item"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          )}
        </form>
        </div>
      </div>
    </>
  );
}
