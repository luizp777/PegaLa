import { useState } from 'react';
import { Activity, Check, Lock, LogOut, Pencil, Plus, Trash2, Users } from 'lucide-react';
import type { ShoppingList } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { ListTypeIcon } from './ItemIcon';

interface ListSwitcherMenuProps {
  lists: ShoppingList[];
  activeListId: string | undefined;
  currentUserId: string | null;
  sessionLoaded: boolean;
  onSelectList: (id: string) => void;
  onRenameList: (id: string, newName: string) => void;
  onOpenCreateList: () => void;
  onDeleteList: (id: string) => void;
  onLeaveList: (id: string) => void;
  onCopyDiagnostics?: () => void;
  onClose: () => void;
}

/**
 * Menu suspenso de gerenciamento de listas (seleção, renomeação inline, exclusão/saída e diagnóstico).
 */
export function ListSwitcherMenu({
  lists,
  activeListId,
  currentUserId,
  sessionLoaded,
  onSelectList,
  onRenameList,
  onOpenCreateList,
  onDeleteList,
  onLeaveList,
  onCopyDiagnostics,
  onClose,
}: ListSwitcherMenuProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <div
      role="menu"
      aria-label="Suas Listas"
      className="animate-fade-slide-up absolute left-0 top-full mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Suas Listas
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {lists.map((list) => {
          const isCurrent = list.id === activeListId;
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
                    className="h-9 min-w-0 flex-1 rounded-lg border border-emerald-500 bg-white px-2 text-base font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-zinc-950 dark:text-zinc-100 sm:text-sm"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"
                    aria-label="Salvar novo nome"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectList(list.id);
                      onClose();
                    }}
                    className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2.5 text-left"
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
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      aria-label={`Renomear ${list.name}`}
                      title="Renomear lista"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {lists.length > 1 && (() => {
                      const awaitingSession = Boolean(
                        isSupabaseConfigured && list.isShared && list.ownerId && !sessionLoaded
                      );
                      const isGuest = Boolean(
                        list.isShared &&
                          list.ownerId &&
                          (!currentUserId || list.ownerId !== currentUserId)
                      );
                      const confirmLabel = isGuest
                        ? 'Sair?'
                        : list.isShared
                          ? 'Apagar p/ todos?'
                          : 'Confirmar?';
                      return confirmDeleteId === list.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={awaitingSession}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (awaitingSession) return;
                              if (isGuest) {
                                onLeaveList(list.id);
                              } else {
                                onDeleteList(list.id);
                              }
                              setConfirmDeleteId(null);
                              onClose();
                            }}
                            className="h-8 shrink-0 rounded-lg bg-red-600 px-2 text-[11px] font-bold text-white transition hover:bg-red-500 active:scale-95 disabled:opacity-40"
                            aria-label={
                              isGuest
                                ? `Confirmar saída de ${list.name}`
                                : `Confirmar exclusão de ${list.name}`
                            }
                          >
                            {confirmLabel}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="h-8 shrink-0 rounded-lg bg-zinc-200/80 px-2 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
                            aria-label="Cancelar"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={awaitingSession}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(list.id);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label={
                            awaitingSession
                              ? `Verificando permissões de ${list.name}`
                              : isGuest
                                ? `Sair de ${list.name}`
                                : `Excluir ${list.name}`
                          }
                          title={
                            awaitingSession
                              ? 'Verificando permissões...'
                              : isGuest
                                ? 'Sair desta lista compartilhada'
                                : 'Excluir lista'
                          }
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
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenCreateList();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <Plus className="h-4 w-4" />
          Nova lista
        </button>
        {onCopyDiagnostics && (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onCopyDiagnostics();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <Activity className="h-3.5 w-3.5" />
            Copiar diagnóstico
          </button>
        )}
      </div>
    </div>
  );
}
