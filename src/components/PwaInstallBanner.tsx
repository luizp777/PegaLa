import { Download, Share, X } from 'lucide-react';

/**
 * Propriedades do componente {@link PwaInstallBanner}.
 */
interface PwaInstallBannerProps {
  /** Indica se deve exibir o guia curto manual para iOS Safari. */
  isIosManualInstall: boolean;
  /** Dispara o diálogo nativo de instalação do PWA (Android/Desktop). */
  onInstall: () => void;
  /** Dispensa o banner por 7 dias. */
  onDismiss: () => void;
}

/**
 * Banner discreto exibido no topo quando o PegaLá ainda não está instalado como aplicativo,
 * oferecendo instalação com 1 toque (Android/Desktop) ou instrução curta para iOS Safari.
 *
 * @param props - Propriedades do banner de instalação PWA.
 * @returns Banner renderizado.
 */
export function PwaInstallBanner({
  isIosManualInstall,
  onInstall,
  onDismiss,
}: PwaInstallBannerProps) {
  return (
    <div className="animate-fade-slide-up mb-3 flex items-center justify-between gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-50/80 px-3 py-2.5 text-xs dark:border-emerald-500/25 dark:bg-emerald-950/35">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
          {isIosManualInstall ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="truncate font-bold text-zinc-900 dark:text-zinc-100">
            Instale o PegaLá na tela inicial
          </div>
          <div className="line-clamp-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
            {isIosManualInstall
              ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início"'
              : 'Acesso instantâneo no mercado, mesmo sem internet'}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!isIosManualInstall && (
          <button
            type="button"
            onClick={onInstall}
            className="h-9 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-500 active:scale-95"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-emerald-500/10 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
          aria-label="Dispensar convite de instalação por 7 dias"
          title="Fechar por 7 dias"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
