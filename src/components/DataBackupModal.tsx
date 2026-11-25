import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Database, Download, Trash2, Upload, X } from 'lucide-react';
import {
  clearPriceComparisonCaches,
  clearUserDictionary,
  getLocalDataStats,
  type LocalDataStats,
} from '../db/localDb';
import {
  exportLocalBackup,
  importLocalBackup,
  validateBackupPayload,
  type LocalBackupPayload,
} from '../lib/localBackup';
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

/**
 * Propriedades do componente {@link DataBackupModal}.
 */
interface DataBackupModalProps {
  /** Indica se o modal está aberto. */
  open: boolean;
  /** Fecha o modal. */
  onClose: () => void;
  /** Seleciona uma lista após importação. */
  onSelectList: (listId: string) => void;
  /** Exibe toast global de feedback. */
  onShowToast: (message: string) => void;
}

/**
 * Modal lazy-loaded para gerenciamento de dados locais offline:
 * exibe contadores do IndexedDB, exporta/importa backup JSON (Mesclar ou Substituir)
 * e oferece limpeza seletiva de cache de preços e histórico de sugestões.
 *
 * @param props - Propriedades do modal de dados e backup.
 * @returns Modal renderizado ou `null` quando fechado.
 */
export function DataBackupModal({
  open,
  onClose,
  onSelectList,
  onShowToast,
}: DataBackupModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<LocalDataStats | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [pendingImport, setPendingImport] = useState<LocalBackupPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClearTarget, setConfirmClearTarget] = useState<'prices' | 'dictionary' | null>(null);

  useModalAccessibility(open, dialogRef, onClose);

  const refreshStats = async () => {
    const next = await getLocalDataStats();
    setStats(next);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getLocalDataStats().then((next) => {
      if (!cancelled) setStats(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    setStatusError(null);
    try {
      const payload = await exportLocalBackup();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pegala-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      hapticSuccess();
      onShowToast('Backup JSON baixado!');
    } catch {
      setStatusError('Não foi possível gerar o arquivo de backup.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatusError(null);
    setPendingImport(null);

    if (file.size > 5 * 1024 * 1024) {
      setStatusError('Arquivo muito grande (limite de 5 MB).');
      return;
    }

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const validation = validateBackupPayload(parsed);
      if (!validation.ok) {
        setStatusError(validation.error);
        return;
      }

      if (importMode === 'replace') {
        setPendingImport(validation.data);
        return;
      }

      await executeImport(validation.data, 'merge');
    } catch {
      setStatusError('Não foi possível ler o arquivo JSON selecionado.');
    }
  };

  const executeImport = async (payload: LocalBackupPayload, mode: 'merge' | 'replace') => {
    setBusy(true);
    setStatusError(null);
    try {
      const result = await importLocalBackup(payload, mode);
      setPendingImport(null);
      await refreshStats();
      if (result.firstListId) {
        onSelectList(result.firstListId);
      }
      hapticSuccess();
      onShowToast(
        `Backup importado: ${result.listsImported} ${result.listsImported === 1 ? 'lista' : 'listas'} e ${result.itemsImported} ${result.itemsImported === 1 ? 'item' : 'itens'}!`
      );
      onClose();
    } catch {
      setStatusError('Erro ao importar os dados do backup.');
    } finally {
      setBusy(false);
    }
  };

  const handleClearPrices = async () => {
    setBusy(true);
    try {
      const removed = await clearPriceComparisonCaches();
      setConfirmClearTarget(null);
      await refreshStats();
      hapticLight();
      onShowToast(
        removed > 0
          ? `Cache de preços limpo (${removed} ${removed === 1 ? 'lista' : 'listas'}).`
          : 'Nenhum cache de preços para limpar.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClearDictionary = async () => {
    setBusy(true);
    try {
      const removed = await clearUserDictionary();
      setConfirmClearTarget(null);
      await refreshStats();
      hapticWarning();
      onShowToast(
        removed > 0
          ? `Histórico de sugestões resetado (${removed} ${removed === 1 ? 'termo' : 'termos'}).`
          : 'O histórico de sugestões já está vazio.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-backup-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-drawer-up pb-safe max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white p-5 shadow-2xl focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Database className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 id="data-backup-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Dados e Backup Local
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Exporte, restaure ou limpe dados offline deste aparelho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Local Storage Stats */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[
            { label: 'Listas', value: stats?.lists ?? '—' },
            { label: 'Itens', value: stats?.items ?? '—' },
            { label: 'Sugestões', value: stats?.dictionary ?? '—' },
            { label: 'Preços', value: stats?.priceCaches ?? '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-2 py-2.5 text-center dark:border-zinc-800 dark:bg-zinc-950/60"
            >
              <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">{stat.value}</div>
              <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Export & Import JSON */}
        <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Backup JSON Offline
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar backup (.json)
          </button>

          <div className="border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Modo de importação:
              </span>
              <div className="inline-flex rounded-xl bg-zinc-200/70 p-0.5 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setImportMode('merge');
                    setPendingImport(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    importMode === 'merge'
                      ? 'bg-white text-emerald-700 shadow-2xs dark:bg-zinc-900 dark:text-emerald-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Mesclar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportMode('replace');
                    setPendingImport(null);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    importMode === 'replace'
                      ? 'bg-white text-red-600 shadow-2xs dark:bg-zinc-900 dark:text-red-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Substituir
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
              aria-label="Selecionar arquivo de backup JSON"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <Upload className="h-4 w-4" />
              Importar backup (.json)
            </button>

            {pendingImport && (
              <div className="mt-2.5 rounded-xl border border-red-500/30 bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="font-bold">Substituir todos os dados locais?</p>
                    <p className="mt-0.5 text-[11px] opacity-90">
                      Suas listas atuais deste aparelho serão apagadas e substituídas por{' '}
                      {pendingImport.lists.length}{' '}
                      {pendingImport.lists.length === 1 ? 'lista' : 'listas'} e{' '}
                      {pendingImport.items.length}{' '}
                      {pendingImport.items.length === 1 ? 'item' : 'itens'} do backup.
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingImport(null)}
                    className="h-8 rounded-lg bg-zinc-200 px-3 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void executeImport(pendingImport, 'replace')}
                    className="h-8 rounded-lg bg-red-600 px-3 text-xs font-bold text-white"
                  >
                    Confirmar substituição
                  </button>
                </div>
              </div>
            )}

            {statusError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                {statusError}
              </p>
            )}
          </div>
        </div>

        {/* Selective Cleanup */}
        <div className="mt-4 space-y-2 rounded-2xl border border-zinc-200/80 p-3.5 dark:border-zinc-800">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Limpeza Seletiva
          </div>

          <div className="flex items-center justify-between gap-2 py-1">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Cache de comparação de preços
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Remove cotações salvas offline sem apagar suas listas
              </div>
            </div>
            {confirmClearTarget === 'prices' ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleClearPrices()}
                  className="h-8 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearTarget(null)}
                  className="h-8 rounded-lg bg-zinc-200 px-2 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || (stats?.priceCaches ?? 0) === 0}
                onClick={() => setConfirmClearTarget('prices')}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-zinc-200 px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Histórico de sugestões aprendidas
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Reseta frequência de itens e corredores aprendidos
              </div>
            </div>
            {confirmClearTarget === 'dictionary' ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleClearDictionary()}
                  className="h-8 rounded-lg bg-red-600 px-2.5 text-xs font-bold text-white"
                >
                  Resetar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearTarget(null)}
                  className="h-8 rounded-lg bg-zinc-200 px-2 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || (stats?.dictionary ?? 0) === 0}
                onClick={() => setConfirmClearTarget('dictionary')}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-zinc-200 px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Resetar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
