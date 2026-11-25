import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Lock,
  Moon,
  RefreshCw,
  Share2,
  Sun,
  Users,
  WifiOff,
  Zap,
  Cloud,
  HardDrive,
} from 'lucide-react';
import type { ShoppingList } from '../types';
import { useAuthSession } from '../hooks/useAuthSession';
import { isSupabaseConfigured } from '../lib/supabase';
import { ListTypeIcon } from './ItemIcon';
import { ListSwitcherMenu } from './ListSwitcherMenu';

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
  /** Callback acionado ao renomear uma lista pelo seu ID. */
  onRenameList: (id: string, newName: string) => void;
  /** Abre o modal de criação de nova lista. */
  onOpenCreateList: () => void;
  /** Callback acionado para excluir uma lista como proprietário pelo seu ID. */
  onDeleteList: (id: string) => void;
  /** Callback acionado para sair de uma lista compartilhada como convidado pelo seu ID. */
  onLeaveList: (id: string) => void;
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
  /** Indica se há sincronização manual em andamento. */
  isSyncing?: boolean;
  /** Callback acionado ao tocar no botão de sincronização manual. */
  onForceSync?: () => void;
  /** Copia o relatório técnico de diagnóstico (sem PII) para a área de transferência. */
  onCopyDiagnostics?: () => void;
}

/**
 * Cabeçalho fixo do aplicativo com seletor de listas vetorial, resumo e barra de progresso da compra,
 * status de sincronização, botão de tela acesa (Wake Lock), compartilhamento e alternância de tema.
 *
 * @remarks
 * Aguarda a hidratação da sessão antes de liberar ações destrutivas em listas compartilhadas,
 * restaura o foco no botão acionador ao fechar o menu via `Escape` e aplica `role="menuitem"` nas ações.
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
  onRenameList,
  onOpenCreateList,
  onDeleteList,
  onLeaveList,
  onOpenShare,
  isDark,
  onToggleTheme,
  wakeLockSupported,
  wakeLockActive,
  onToggleWakeLock,
  isOnline,
  pendingSyncCount,
  isSyncing = false,
  onForceSync,
  onCopyDiagnostics,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUserId, sessionLoaded } = useAuthSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        triggerButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const totalCount = pendingCount + checkedCount;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <header className="relative z-20 border-b border-zinc-200/80 bg-white/90 pt-safe backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-2 sm:px-4">
        {/* Left: List Switcher */}
        <div className="relative min-w-0 flex-1" ref={menuRef}>
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => {
              setMenuOpen((o) => !o);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex min-h-[44px] max-w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-zinc-100 active:scale-[0.99] dark:hover:bg-zinc-900"
            aria-label="Trocar lista"
          >
            <span
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                activeList?.isShared
                  ? 'bg-sky-500/12 text-sky-600 ring-1 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400'
                  : 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
              }`}
            >
              <ListTypeIcon type={activeList?.type ?? 'mercado'} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                  {activeList?.name ?? 'PegaLá'}
                </h1>
                {activeList && (
                  activeList.isShared ? (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-sky-500/12 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 sm:inline-flex">
                      <Users className="h-3 w-3" />
                      <span>Compartilhada</span>
                    </span>
                  ) : (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 sm:inline-flex">
                      <Lock className="h-2.5 w-2.5" />
                      <span>Privada</span>
                    </span>
                  )
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {activeList && (
                  activeList.isShared ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-sky-600 dark:text-sky-400 sm:hidden">
                      <Users className="h-2.5 w-2.5" />
                      Compartilhada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 sm:hidden">
                      <Lock className="h-2.5 w-2.5" />
                      Privada
                    </span>
                  )
                )}
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
            <ListSwitcherMenu
              lists={lists}
              activeListId={activeList?.id}
              currentUserId={currentUserId}
              sessionLoaded={sessionLoaded}
              onSelectList={onSelectList}
              onRenameList={onRenameList}
              onOpenCreateList={onOpenCreateList}
              onDeleteList={onDeleteList}
              onLeaveList={onLeaveList}
              onCopyDiagnostics={onCopyDiagnostics}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex shrink-0 items-center gap-1">
          {isSupabaseConfigured && isOnline && pendingSyncCount > 0 && onForceSync && (
            <button
              type="button"
              onClick={onForceSync}
              disabled={isSyncing}
              title="Sincronizar alterações pendentes agora"
              aria-label="Sincronizar alterações pendentes agora"
              className="flex h-10 items-center gap-1 rounded-xl bg-emerald-500/12 px-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/20 active:scale-95 disabled:opacity-60 dark:text-emerald-300"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{pendingSyncCount}</span>
            </button>
          )}

          {wakeLockSupported && (
            <button
              type="button"
              onClick={onToggleWakeLock}
              aria-pressed={wakeLockActive}
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
        <div className="h-1 w-full bg-zinc-200/70 dark:bg-zinc-800/80" aria-hidden="true">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </header>
  );
}
