import { useState, useRef, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  Lock,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Share2,
  Sun,
  Trash2,
  Users,
  WifiOff,
  Zap,
  Cloud,
  HardDrive,
} from 'lucide-react';
import type { ShoppingList } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
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
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen || !supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id ?? null);
    });
  }, [menuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDeleteId(null);
        setEditingListId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setConfirmDeleteId(null);
        setEditingListId(null);
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
            <div className="animate-fade-slide-up absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Suas Listas
              </div>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {lists.map((list) => {
                  const isCurrent = list.id === activeList?.id;
                  const isEditing = editingListId === list.id;
                  return (
                    <div
                      key={list.id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 transition ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (editingName.trim()) {
                              onRenameList(list.id, editingName.trim());
                            }
                            setEditingListId(null);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                setEditingListId(null);
                              }
                            }}
                            aria-label={`Novo nome para ${list.name}`}
                            className="h-8 min-w-0 flex-1 rounded-lg border border-emerald-500 bg-white px-2 text-base font-semibold text-zinc-900 focus:outline-none dark:bg-zinc-950 dark:text-zinc-100 sm:text-sm"
                          />
                          <button
                            type="submit"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"
                            aria-label="Salvar novo nome"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </form>
                      ) : (
                        <>
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
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-semibold">{list.name}</span>
                                {list.isShared ? (
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-300">
                                    <Users className="h-2.5 w-2.5" />
                                    Compartilhada
                                  </span>
                                ) : (
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-zinc-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    <Lock className="h-2.5 w-2.5" />
                                    Privada
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{list.shareCode}</div>
                            </div>
                          </button>
                          <div className="ml-1 flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingListId(list.id);
                                setEditingName(list.name);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded-lg p-1.5 text-zinc-400 opacity-70 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                              aria-label={`Renomear ${list.name}`}
                              title="Renomear lista"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {lists.length > 1 && (() => {
                              const isGuest = Boolean(
                                list.isShared && list.ownerId && currentUserId && list.ownerId !== currentUserId
                              );
                              const confirmLabel = isGuest
                                ? 'Sair?'
                                : list.isShared
                                  ? 'Apagar p/ todos?'
                                  : 'Confirmar?';
                              return confirmDeleteId === list.id ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isGuest) {
                                      onLeaveList(list.id);
                                    } else {
                                      onDeleteList(list.id);
                                    }
                                    setConfirmDeleteId(null);
                                    setMenuOpen(false);
                                  }}
                                  className="ml-0.5 shrink-0 rounded-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white transition hover:bg-red-500 active:scale-95"
                                  aria-label={
                                    isGuest
                                      ? `Confirmar saída de ${list.name}`
                                      : `Confirmar exclusão de ${list.name}`
                                  }
                                >
                                  {confirmLabel}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(list.id);
                                  }}
                                  className="rounded-lg p-1.5 text-zinc-400 opacity-70 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                  aria-label={isGuest ? `Sair de ${list.name}` : `Excluir ${list.name}`}
                                  title={isGuest ? 'Sair desta lista compartilhada' : 'Excluir lista'}
                                >
                                  {isGuest ? <LogOut className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                              );
                            })()}
                          </div>
                        </>
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
