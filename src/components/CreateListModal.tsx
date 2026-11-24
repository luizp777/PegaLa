import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ListType } from '../types';
import { ListTypeIcon } from './ItemIcon';

/**
 * Propriedades do componente {@link CreateListModal}.
 */
interface CreateListModalProps {
  /** Indica se o modal está visível. */
  open: boolean;
  /** Fecha o modal de criação. */
  onClose: () => void;
  /** Callback assíncrono que persiste a nova lista com nome e tipo escolhidos. */
  onCreate: (name: string, type: ListType) => Promise<void>;
}

const LIST_TYPES: Array<{ id: ListType; label: string }> = [
  { id: 'mercado', label: 'Mercado' },
  { id: 'farmacia', label: 'Farmácia' },
  { id: 'geral', label: 'Geral / Evento' },
];

/**
 * Modal / Bottom Sheet para criação de novas listas personalizadas (Mercado, Farmácia ou Geral).
 *
 * @param props - Propriedades do modal de criação de lista.
 * @returns Modal renderizado ou `null` quando fechado.
 */
export function CreateListModal({ open, onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ListType>('mercado');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate(name.trim(), type);
    setName('');
    setType('mercado');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nova Lista"
        className="animate-drawer-up w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Nova Lista</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Nome da lista
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Churrasco, Feira, Farmácia..."
              className="h-12 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3.5 text-base text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LIST_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition ${
                    type === t.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
                  }`}
                >
                  <ListTypeIcon type={t.id} className="h-5 w-5" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-40"
          >
            Criar Lista
          </button>
        </form>
      </div>
    </div>
  );
}
