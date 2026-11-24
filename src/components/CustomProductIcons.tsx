import type { SVGProps } from 'react';

/**
 * Propriedades padrão compatíveis com ícones `lucide-react` para os SVGs line-art customizados.
 */
export interface CustomSvgIconProps extends SVGProps<SVGSVGElement> {
  /** Espessura do traço vetorial (padrão `1.85`). */
  strokeWidth?: number;
}

/**
 * Ícone minimalista duotone de fatia de queijo com furos (queijos, mussarela, prato, parmesão).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CheeseWedgeIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12L17 5l4 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M3 12h18" />
      <circle cx="8.5" cy="15.5" r="1.2" />
      <circle cx="15" cy="16" r="1" />
      <circle cx="12.5" cy="9.5" r="0.9" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de rolo de papel higiênico / papel toalha.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ToiletPaperIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="10" cy="6.5" rx="6" ry="2.5" fill="currentColor" fillOpacity={0.12} />
      <ellipse cx="10" cy="6.5" rx="1.8" ry="0.8" />
      <path d="M4 6.5V16c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V6.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M16 9h3a1 1 0 0 1 1 1v9l-2-1.2L16 19v-3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de tubo de creme dental / pomada.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ToothpasteIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 4l4 4-9.5 9.5a2.12 2.12 0 0 1-1.5.62H6.5L5.88 15.6a2.12 2.12 0 0 1 .62-1.5L16 4Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M5.5 18.5L3.5 20.5" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de escova de dente.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ToothbrushIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20L19 5" />
      <path d="M14 4l3.5 3.5" />
      <path d="M12.2 5.8l3.5 3.5" />
      <path d="M15.8 2.2l3.5 3.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de fralda infantil / geriátrica.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function DiaperIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16v4a4 4 0 0 1-3 3.87L15 19H9l-2-5.13A4 4 0 0 1 4 10V6Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M4 9h3" />
      <path d="M17 9h3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de detergente / amaciante / sabão líquido.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function DetergentBottleIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 3h6v3H9z" />
      <path d="M10 6v2l-3.5 2.5A2 2 0 0 0 5.5 12v7a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-7a2 2 0 0 0-1-1.5L14 8V6" fill="currentColor" fillOpacity={0.12} />
      <path d="M15.5 12.5v3" />
      <path d="M9 14h3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de caixa de sabão em pó / tira-manchas.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function LaundryBoxIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M9.5 13c1-1 4 1 5 0" />
      <path d="M8 7.5h8" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pão de forma fatiado.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BreadLoafIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 10a4 4 0 0 1 2-7h10a4 4 0 0 1 2 7v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 8v12" />
      <path d="M14 8v12" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pacote/saco de arroz, feijão, farinha, açúcar ou carvão.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function RiceBagIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 5l2-2h6l2 2v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 8h10" />
      <path d="M10 13h4" />
      <path d="M12 11v4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de tigela de espaguete / macarrão.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PastaBowlIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12h16a8 8 0 0 1-16 0Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 12c0-3 2-5 5-5s5 2 5 5" />
      <path d="M9.5 12c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" />
      <path d="M9 20h6" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pote de manteiga / margarina / requeijão.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ButterDishIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="7" width="12" height="7" rx="1.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M3 16h18" />
      <path d="M5 16l1.5 3h11L19 16" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de lata de bebida ou conserva (refrigerante, cerveja, atum).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SodaCanIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 4h8l1 2v12l-1 2H8l-1-2V6l1-2Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 8h10" />
      <path d="M7 16h10" />
      <path d="M11 4V2.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de spray nasal (Sorine, Neosoro, Rinosoro).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function NasalSprayIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 3h2l1 5h-4l1-5Z" />
      <path d="M7 10a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 14h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco conta-gotas (colírio, dipirona gotas, vitamina em gotas).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function EyeDropsIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 3h2l1 4h-4l1-4Z" />
      <path d="M8 9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 12.5c1.1 1.3 1.5 2 1.5 2.7a1.5 1.5 0 0 1-3 0c0-.7.4-1.4 1.5-2.7Z" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de esponja de limpeza / bucha.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SpongeIcon({ strokeWidth = 1.85, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="7" width="16" height="10" rx="3" fill="currentColor" fillOpacity={0.12} />
      <path d="M4 11h16" />
      <circle cx="8.5" cy="14" r="0.8" />
      <circle cx="12.5" cy="14.5" r="0.8" />
      <circle cx="16" cy="13.8" r="0.8" />
    </svg>
  );
}
