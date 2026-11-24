import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gerencia acessibilidade padrão WAI-ARIA para modais e Bottom Sheets:
 * trava o scroll da página, fecha com `Escape`, mantém o foco preso (`Tab` / `Shift+Tab`)
 * dentro do diálogo e restaura o foco ao elemento acionador ao fechar.
 *
 * @remarks
 * O callback `onClose` é armazenado em `useRef` para evitar que re-renderizações do componente pai
 * reiniciem o focus-trap e roubem o foco do usuário durante a digitação.
 *
 * @param isOpen - Indica se o diálogo está aberto.
 * @param containerRef - Referência para o elemento `role="dialog"`.
 * @param onClose - Callback acionado ao pressionar `Escape`.
 */
export function useModalAccessibility(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(document.activeElement)) return;
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container.focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocused && previousFocused.isConnected) {
        previousFocused.focus();
      }
    };
  }, [isOpen, containerRef]);
}
