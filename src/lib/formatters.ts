/**
 * Formata um valor em centavos como moeda brasileira (BRL).
 *
 * @param cents - Valor inteiro em centavos.
 * @returns String formatada (ex.: `"R$ 12,90"`).
 */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Aplica máscara `00000-000` em uma entrada de CEP.
 *
 * @param raw - Texto bruto digitado pelo usuário.
 * @returns CEP formatado com até 8 dígitos.
 */
export function formatCepMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
