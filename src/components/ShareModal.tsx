import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCopy, Copy, Link2, Lock, LogIn, LogOut, MessageCircle, QrCode, Users, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { User } from '@supabase/supabase-js';
import type { ShoppingList } from '../types';
import { db } from '../db/localDb';
import { getSupabaseClient, isSupabaseConfigured, signInWithGoogle, signOutUser } from '../lib/supabase';
import { serializeError, uiLogger } from '../lib/logger';
import { joinSharedListByCode, syncListNow } from '../db/syncEngine';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

/**
 * Propriedades do componente {@link ShareModal}.
 */
interface ShareModalProps {
  /** Indica se o modal de compartilhamento está aberto. */
  open: boolean;
  /** Lista ativa cujos dados de convite serão exibidos. */
  list: ShoppingList | null;
  /** Fecha o modal de compartilhamento. */
  onClose: () => void;
  /** Callback acionado após ingressar com sucesso em uma lista compartilhada remota. */
  onJoinedList: (listId: string) => void;
  /** Copia os itens pendentes formatados por corredor para colar no WhatsApp. */
  onCopyListText?: () => void;
  /** Quantidade de itens pendentes na lista ativa. */
  pendingCount?: number;
}

/**
 * Modal / Bottom Sheet de compartilhamento em tempo real com código curto (`PEGA-XXXXXX`),
 * QR Code, atalho direto para WhatsApp, ingresso em lista por código e login Google opcional.
 *
 * @param props - Propriedades do modal de compartilhamento.
 * @returns Modal renderizado ou `null` quando fechado.
 */
export function ShareModal({
  open,
  list,
  onClose,
  onJoinedList,
  onCopyListText,
  pendingCount = 0,
}: ShareModalProps) {
  const [copiedTarget, setCopiedTarget] = useState<'code' | 'link' | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const listId = list?.id ?? null;

  useModalAccessibility(open && Boolean(list), dialogRef, onClose);

  useEffect(() => {
    if (!open || !isSupabaseConfigured) return;
    let cancelled = false;
    if (listId) {
      void syncListNow(listId);
    }
    void getSupabaseClient().then(async (client) => {
      if (!client || cancelled) return;
      const { data } = await client.auth.getUser();
      if (!cancelled) {
        setUser(data.user && !data.user.is_anonymous ? data.user : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, listId]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  if (!open || !list) return null;

  const shareUrl = `${window.location.origin}/?join=${encodeURIComponent(list.shareCode)}`;

  const markListAsShared = () => {
    if (!list.isShared) {
      void db.lists.update(list.id, { isShared: true });
    }
  };

  const handleCopy = async (text: string, target: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      markListAsShared();
      setCopiedTarget(target);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedTarget(null), 2000);
    } catch (err) {
      uiLogger.debug('Falha ao copiar para a área de transferência', serializeError(err));
      setJoinStatus('Não foi possível copiar automaticamente. Selecione o código manualmente.');
    }
  };

  const handleWhatsAppShare = () => {
    markListAsShared();
    const msg = `Entra na nossa lista "${list.name}" no PegaLá!\nCódigo: ${list.shareCode}\nLink: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinStatus(null);
    const res = await joinSharedListByCode(joinCode);
    setJoining(false);
    if (res.list) {
      onJoinedList(res.list.id);
      setJoinCode('');
      onClose();
    } else {
      setJoinStatus(res.error ?? 'Não foi possível entrar na lista.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="animate-drawer-up max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-safe shadow-2xl focus:outline-none dark:bg-zinc-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="share-modal-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Compartilhar "{list.name}"
              </h2>
              {list.isShared ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/12 px-2 py-0.5 text-[11px] font-bold text-sky-600 dark:bg-sky-500/20 dark:text-sky-300">
                  <Users className="h-3 w-3" />
                  Compartilhada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  <Lock className="h-2.5 w-2.5" />
                  Privada
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Edite junto em tempo real com família ou parceiro(a)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Share Code Box */}
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Código da Lista
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">
              {list.shareCode}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy(list.shareCode, 'code')}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-zinc-700 shadow-xs ring-1 ring-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
              >
                {copiedTarget === 'code' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedTarget === 'code' ? 'Copiado' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!showQr) markListAsShared();
                  setShowQr((v) => !v);
                }}
                aria-label={showQr ? 'Ocultar QR Code' : 'Mostrar QR Code'}
                aria-expanded={showQr}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-xs ring-1 ring-zinc-200 active:scale-95 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                title="Mostrar QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showQr && (
            <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
              <QRCodeSVG
                value={shareUrl}
                size={156}
                role="img"
                aria-label={`QR Code para compartilhar a lista ${list.name}`}
              />
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar no WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleCopy(shareUrl, 'link')}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {copiedTarget === 'link' ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copiedTarget === 'link' ? 'Link copiado' : 'Copiar Link'}
            </button>
          </div>
          {onCopyListText && pendingCount > 0 && (
            <button
              type="button"
              onClick={onCopyListText}
              className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <ClipboardCopy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Copiar texto por corredores ({pendingCount}{' '}
              {pendingCount === 1 ? 'item' : 'itens'})
            </button>
          )}
        </div>

        {/* Join Another List */}
        <form onSubmit={handleJoin} className="mb-4">
          <label
            htmlFor="share-join-code-input"
            className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
          >
            Entrar em uma lista com código
          </label>
          <div className="flex gap-2">
            <input
              id="share-join-code-input"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Ex: PEGA-ABCD1234"
              className="h-11 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 font-mono text-base uppercase text-zinc-900 placeholder:normal-case focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:text-sm"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="h-11 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {joining ? '...' : 'Entrar'}
            </button>
          </div>
          {joinStatus && (
            <p role="alert" className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              {joinStatus}
            </p>
          )}
        </form>

        {/* Optional Google Account Backup */}
        <div className="border-t border-zinc-200 pt-3.5 dark:border-zinc-800">
          {!isSupabaseConfigured ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {import.meta.env.DEV ? (
                <>
                  Modo local ativo. Configure{' '}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">VITE_SUPABASE_URL</code> e{' '}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">VITE_SUPABASE_ANON_KEY</code>{' '}
                  para ativar sincronização em tempo real e login Google.
                </>
              ) : (
                'Modo offline local ativo — suas listas ficam salvas com segurança neste aparelho.'
              )}
            </p>
          ) : user ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Conta conectada
                </div>
                <div className="truncate text-xs text-zinc-500">{user.email}</div>
              </div>
              <button
                type="button"
                disabled={authBusy}
                onClick={async () => {
                  setAuthBusy(true);
                  try {
                    await signOutUser();
                    setUser(null);
                  } finally {
                    setAuthBusy(false);
                  }
                }}
                className="flex min-h-[40px] items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                {authBusy ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                try {
                  const { error } = await signInWithGoogle();
                  if (error) {
                    setJoinStatus(`Não foi possível entrar com Google: ${error}`);
                  }
                } finally {
                  setAuthBusy(false);
                }
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <LogIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {authBusy ? 'Conectando...' : 'Salvar listas com Google (opcional)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
