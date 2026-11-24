/**
 * Aciona a API de vibração do navegador de forma segura, ignorando ambientes sem suporte.
 *
 * @param pattern - Duração única em milissegundos ou sequência de pulsos e pausas.
 */
function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignora navegadores ou plataformas que bloqueiam ou não suportam vibração
  }
}

/**
 * Emite um pulso tátil leve para interações rápidas (ex.: adicionar item ou incrementar quantidade).
 */
export function hapticLight(): void {
  vibrate(12);
}

/**
 * Emite um padrão tátil duplo de confirmação (ex.: marcar item no carrinho ou importar por voz/colagem).
 */
export function hapticSuccess(): void {
  vibrate([14, 35, 18]);
}

/**
 * Emite um pulso tátil mais firme para ações destrutivas (ex.: excluir item).
 */
export function hapticWarning(): void {
  vibrate(28);
}
