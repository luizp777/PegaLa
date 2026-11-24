import { useCallback, useEffect, useState } from 'react';
import { serializeError, uiLogger } from '../lib/logger';

const DISMISS_KEY = 'pegala_pwa_install_dismissed_until';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Evento `BeforeInstallPromptEvent` emitido por navegadores Chromium antes da exibição automática do banner nativo.
 */
interface BeforeInstallPromptEvent extends Event {
  /** Solicita ao navegador que exiba o diálogo nativo de instalação. */
  prompt: () => Promise<void>;
  /** Promessa resolvida com a escolha do usuário (`accepted` ou `dismissed`). */
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Verifica se o banner de instalação do PWA foi dispensado recentemente dentro da janela configurada.
 *
 * @param now - Timestamp atual em milissegundos (padrão `Date.now()`).
 * @returns `true` se o banner ainda estiver no período de dispensa.
 */
export function isPwaInstallDismissed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && now < until;
  } catch {
    return false;
  }
}

/**
 * Salva a dispensa do banner de instalação do PWA por um número de dias.
 *
 * @param days - Quantidade de dias de silenciamento (padrão `7`).
 * @param now - Timestamp base em milissegundos (padrão `Date.now()`).
 */
export function dismissPwaInstallForDays(days = 7, now = Date.now()): void {
  try {
    const until = now + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch (err) {
    uiLogger.debug('Falha ao salvar dispensa do banner PWA no localStorage', serializeError(err));
  }
}

/**
 * Detecta se o aplicativo está rodando em modo instalado (`standalone`).
 *
 * @returns `true` quando aberto como PWA instalado na tela inicial.
 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

/**
 * Detecta se o usuário está no Safari/iOS onde não há `beforeinstallprompt`.
 *
 * @returns `true` para iPhone, iPad ou iPod.
 */
function detectIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Hook React que gerencia o convite discreto de instalação do PWA (Android/Desktop via prompt nativo e iOS via guia curto)
 * com silenciamento por 7 dias quando dispensado.
 *
 * @returns Estado de exibição, flag iOS, função para instalar e função para dispensar por 7 dias.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => isPwaInstallDismissed());
  const isIos = detectIosDevice();

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      uiLogger.warn('Erro ao acionar prompt nativo de instalação PWA', serializeError(err));
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    dismissPwaInstallForDays(SEVEN_DAYS_MS / (24 * 60 * 60 * 1000));
    setDismissed(true);
  }, []);

  const isIosManualInstall = !isStandalone && !deferredPrompt && isIos;
  const canShowBanner = !isStandalone && !dismissed && (Boolean(deferredPrompt) || isIosManualInstall);

  return {
    canShowBanner,
    isIosManualInstall,
    promptInstall,
    dismissInstall,
  };
}
