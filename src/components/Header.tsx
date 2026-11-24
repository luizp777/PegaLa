import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Moon,
  Plus,
  Share2,
  Sun,
  Trash2,
  WifiOff,
  Zap,
  Cloud,
  HardDrive,
} from 'lucide-react';
import type { ShoppingList } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { ListTypeIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link Header}.
 */
interface HeaderProps {
  /** Todas as listas de compras disponíveis no aparelho. */
  lists: ShoppingList[];
  /** Lista atualmente selecionada, ou `null` durante o carregamento inicial. */
  activeList: ShoppingList | null;
  /** Quantidade de itens pendentes para pegar na lista ativa. */
  pendingCount: number;
  /** Quantidade de itens já marcados ("No carrinho / Já tenho") na lista ativa. */
  checkedCount: number;
  /** Callback acionado ao trocar a lista ativa. */
  onSelectList: (id: string) => void;
  /** Abre o modal de criação de nova lista. */
  onOpenCreateList: () => void;
  /** Callback acionado para excluir uma lista pelo seu ID. */
  onDeleteList: (id: string) => void;
  /** Abre o modal de compartilhamento e convites. */
  onOpenShare: () => void;
  /** Indica se o tema escuro está ativo. */
  isDark: boolean;
  /** Alterna entre tema claro e escuro. */
  onToggleTheme: () => void;
  /** Indica se o navegador suporta a Screen Wake Lock API. */
  wakeLockSupported: boolean;
  /** Indica se a tela está atualmente bloqueada contra desligamento automático. */
  wakeLockActive: boolean;
  /** Alterna o estado do bloqueio de tela acesa. */
  onToggleWakeLock: () => void;
  /** Indica se o navegador está conectado à internet. */
  isOnline: boolean;
  /** Quantidade de mutações locais pendentes de envio ao Supabase. */
  pendingSyncCount: number;
}

/**
 * Cabeçalho fixo do aplicativo com seletor de listas vetorial, resumo e barra de progresso da compra,
 * status de sincronização, botão de tela acesa (Wake Lock), compartilhamento e alternância de tema.
 *
 * @param props - Propriedades de controle do cabeçalho.
 * @returns Elemento `<header>` renderizado.
 */
export function Header({
  lists,
  activeList,
  pendingCount,
  checkedCount,
  onSelectList,
  onOpenCreateList,
  onDeleteList,
  onOpenShare,
  isDark,
  onToggleTheme,
  wakeLockSupported,
  wakeLockActive,
  onToggleWakeLock,
  isOnline,
  pendingSyncCount,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDeleteId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const totalCount = pendingCount + checkedCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
        {/* Left: List Switcher */}
        <div className="relative min-w-0 flex-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((o) => !o);
              setConfirmDeleteId(null);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex min-h-[44px] max-w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-zinc-100 active:scale-[0.99] dark:hover:bg-zinc-900"
            aria-label="Trocar lista"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <ListTypeIcon type={activeList?.type ?? 'mercado'} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                  {activeList?.name ?? 'PegaLá'}
                </h1>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {totalCount > 0 && (
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {pendingCount === 0
                      ? 'Tudo pego!'
                      : `Faltam ${pendingCount} · ${checkedCount} no carrinho`}
                  </span>
                )}
                {!isOnline ? (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                ) : isSupabaseConfigured ? (
                  <span
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                    title={pendingSyncCount > 0 ? 'Sincronizando alterações com a nuvem' : 'Sincronizado na nuvem'}
                    aria-label={pendingSyncCount > 0 ? 'Sincronizando alterações com a nuvem' : 'Sincronizado na nuvem'}
                  >
                    <Cloud className="h-3 w-3" />
                    {pendingSyncCount > 0 ? 'Sincronizando...' : totalCount === 0 ? 'Sincronizado' : ''}
                  </span>
                ) : totalCount === 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="h-3 w-3" /> Local (Offline-First)
                  </span>
                ) : null}
              </div>
            </div>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-64 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Suas Listas
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {lists.map((list) => {
                  const isCurrent = list.id === activeList?.id;
                  return (
                    <div
                      key={list.id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 transition ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectList(list.id);
                          setMenuOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <ListTypeIcon
                          type={list.type}
                          className={`h-4 w-4 shrink-0 ${
                            isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{list.name}</div>
                          <div className="text-[11px] text-zinc-400">{list.shareCode}</div>
                        </div>
                      </button>
                      {lists.length > 1 && (
                        confirmDeleteId === list.id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteList(list.id);
                              setConfirmDeleteId(null);
                              setMenuOpen(false);
                            }}
                            className="ml-1 shrink-0 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-red-500 active:scale-95"
                            aria-label={`Confirmar exclusão de ${list.name}`}
                          >
                            Confirmar?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(list.id);
                            }}
                            className="ml-1 rounded-lg p-1.5 text-zinc-400 opacity-70 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            aria-label={`Excluir ${list.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 border-t border-zinc-200 pt-1 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCreateList();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="h-4 w-4" />
                  Nova lista
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex shrink-0 items-center gap-1">
          {wakeLockSupported && (
            <button
              type="button"
              onClick={onToggleWakeLock}
              title={wakeLockActive ? 'Tela mantida acesa (toque para desligar)' : 'Manter tela acesa durante a compra'}
              aria-label="Manter tela acesa"
              className={`flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition active:scale-95 ${
                wakeLockActive
                  ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/40 dark:text-amber-400'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
              }`}
            >
              <Zap className={`h-4 w-4 ${wakeLockActive ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{wakeLockActive ? 'Tela acesa' : 'Manter acesa'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenShare}
            title="Compartilhar lista"
            aria-label="Compartilhar lista"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <Share2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Shopping Progress Micro-Bar */}
      {totalCount > 0 && (
        <div className="h-0.5 w-full bg-zinc-200/70 dark:bg-zinc-800/80" aria-hidden="true">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
