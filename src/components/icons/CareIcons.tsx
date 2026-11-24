import type { CustomSvgIconProps } from '../CustomProductIcons';

/**
 * Ícone minimalista duotone de frasco pump (shampoo, condicionador, sabonete líquido).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ShampooBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v3" />
      <path d="M9.5 3h5l1 1" />
      <rect x="7" y="8" width="10" height="13" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 6h4v2h-4z" />
      <path d="M10 13h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de sabonete em barra.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SoapBarIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="8" width="16" height="9" rx="4.5" fill="currentColor" fillOpacity={0.12} />
      <circle cx="8" cy="5" r="1" />
      <circle cx="15.5" cy="4.5" r="1.2" />
      <path d="M8.5 12.5h7" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de desodorante aerosol / roll-on.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function DeodorantIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="8.5" y="7" width="7" height="13.5" rx="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M9.5 7V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7" />
      <path d="M17.5 4.5l1.5-.5" />
      <path d="M17.5 6.5l1.5.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de aparelho de barbear.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function RazorIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="3.5" width="12" height="4" rx="1.2" fill="currentColor" fillOpacity={0.12} />
      <path d="M8 5.5h8" />
      <path d="M12 7.5v13" />
      <path d="M10.5 20.5h3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de enxaguante bucal / água micelar.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function MouthwashIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9.5" y="3" width="5" height="3.5" rx="0.8" />
      <path d="M7 9.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 13h10" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cotonetes / hastes flexíveis.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CottonSwabIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 17L17 7" />
      <circle cx="6.5" cy="17.5" r="2" fill="currentColor" fillOpacity={0.12} />
      <circle cx="17.5" cy="6.5" r="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 19l7-7" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de absorvente higiênico.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SanitaryPadIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 4a3 3 0 0 1 6 0v3.5l2.5 2.5v4L15 16.5V20a3 3 0 0 1-6 0v-3.5L6.5 14v-4L9 7.5V4Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M11 9v6" />
      <path d="M13 9v6" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de bisnaga de protetor solar / hidratante.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SunscreenTubeIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 4h10l-1.5 13h-7L7 4Z" fill="currentColor" fillOpacity={0.12} />
      <rect x="9.5" y="17" width="5" height="3" rx="0.8" />
      <circle cx="12" cy="10" r="2" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de perfume / sérum.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PerfumeBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9.5" y="3" width="5" height="3.5" rx="0.8" />
      <path d="M10.5 6.5h3v2h-3z" />
      <rect x="6" y="8.5" width="12" height="12" rx="3" fill="currentColor" fillOpacity={0.12} />
      <path d="M9.5 14.5h5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de esmalte / acetona.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function NailPolishIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 3h4l.5 6h-5L10 3Z" />
      <path d="M7 9h10l1 9.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L7 9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M9.5 14.5h5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de vassoura / rodo.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BroomIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 3l-5.5 7.5" />
      <path d="M8 9.5l5 3.5-4.5 7.5-5-3.5L8 9.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M5.5 15.5l2 1.5" />
    </svg>
  );
}
