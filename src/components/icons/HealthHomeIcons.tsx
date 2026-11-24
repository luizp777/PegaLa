import type { CustomSvgIconProps } from '../CustomProductIcons';

/**
 * Ícone minimalista duotone de frasco de xarope / soro fisiológico / álcool 70%.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SyrupBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9.5" y="3" width="5" height="3" rx="0.8" />
      <path d="M7.5 9a2.5 2.5 0 0 1 2.5-2.5h4A2.5 2.5 0 0 1 16.5 9v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 11.5v4" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cartela de comprimidos.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PillBlisterIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <circle cx="9.5" cy="8.5" r="1.5" />
      <circle cx="14.5" cy="8.5" r="1.5" />
      <circle cx="9.5" cy="14.5" r="1.5" />
      <circle cx="14.5" cy="14.5" r="1.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de rolo de esparadrapo / atadura / gaze.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BandageRollIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10.5" cy="12" r="6.5" fill="currentColor" fillOpacity={0.12} />
      <circle cx="10.5" cy="12" r="2.3" />
      <path d="M10.5 18.5h9" />
      <path d="M17 15.5l2.5 3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de máscara cirúrgica descartável.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SurgicalMaskIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="7.5" width="12" height="9" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M6 9.5H4a1.5 1.5 0 0 0-1.5 1.5v2A1.5 1.5 0 0 0 4 14.5h2" />
      <path d="M18 9.5h2a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5h-2" />
      <path d="M9 12h6" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de mamadeira / fórmula infantil.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BabyBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.5 5.5l1-3h1l1 3" />
      <rect x="8" y="5.5" width="8" height="2.5" rx="1" />
      <rect x="7" y="8" width="10" height="12.5" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 12h3" />
      <path d="M7 15.5h2.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de chupeta / mordedor.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PacifierIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 10a3 3 0 0 1 6 0v2H9v-2Z" fill="currentColor" fillOpacity={0.12} />
      <rect x="6" y="12" width="12" height="3.5" rx="1.75" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="18" r="2.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de caixa de areia sanitária / tapete higiênico.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CatLitterIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 11h16l-1.5 7.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 11Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M3 11h18" />
      <circle cx="9" cy="15" r="0.7" fill="currentColor" />
      <circle cx="12" cy="14.5" r="0.7" fill="currentColor" />
      <circle cx="15" cy="15.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pacote de ração pet.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PetFoodBagIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6.5 6l2-2.5h7l2 2.5v13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V6Z" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="14" r="1.8" />
      <circle cx="9.8" cy="11.2" r="0.8" fill="currentColor" />
      <circle cx="14.2" cy="11.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de rolo de papel alumínio / filme PVC / papel manteiga.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function FoilRollIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="8" width="16" height="7" rx="3" fill="currentColor" fillOpacity={0.12} />
      <ellipse cx="7" cy="11.5" rx="1.8" ry="3.5" />
      <path d="M7 15h11l2 3.5H9L7 15Z" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cabide / prendedor de roupa.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function HangerIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 7a2 2 0 1 0-2-2" />
      <path d="M12 7v2l8.5 6.5a1.5 1.5 0 0 1-.9 2.7H4.4a1.5 1.5 0 0 1-.9-2.7L12 9Z" fill="currentColor" fillOpacity={0.12} />
    </svg>
  );
}
