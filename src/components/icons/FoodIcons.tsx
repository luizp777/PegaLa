import type { CustomSvgIconProps } from '../CustomProductIcons';

/**
 * Ícone minimalista duotone de hambúrguer.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BurgerIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 10a7 7 0 0 1 14 0H5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M4 13.5h16" />
      <path d="M5 16.5h14v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-1Z" fill="currentColor" fillOpacity={0.12} />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de linguiça / salsicha.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SausageIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.5 5a2.5 2.5 0 0 1 1.8 4.2l-9.8 9.8a2.5 2.5 0 1 1-3.6-3.6l9.8-9.8A2.5 2.5 0 0 1 17.5 5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M19 4.5l1-.5" />
      <path d="M5 19l-1 1" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de fatias de bacon.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BaconIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 8c3-2 5 2 8 0s5 2 8 0v8c-3 2-5-2-8 0s-5-2-8 0V8Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M4 12c3-2 5 2 8 0s5 2 8 0" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de caixa de leite Tetra Pak.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function MilkCartonIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3h8v3l2.5 3.5V19a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9.5L8 6V3Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M5.5 9.5h13" />
      <path d="M12 13c1 1.2 1.5 2 1.5 2.7a1.5 1.5 0 0 1-3 0c0-.7.5-1.5 1.5-2.7Z" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pote de iogurte / leite fermentado.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function YogurtCupIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 7h14l-1.8 11.5a2 2 0 0 1-2 1.5H8.8a2 2 0 0 1-2-1.5L5 7Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M4 7h16" />
      <path d="M14 4l-2 3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pote de vidro (geleia, mel, pasta de amendoim, azeitona, palmito).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function JamJarIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="7" y="4" width="10" height="3" rx="1" />
      <rect x="6" y="7" width="12" height="13" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 12h6" />
      <path d="M9 15h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de garrafa de azeite / óleo / vinagre.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function OliveOilBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.5 3h3v3l2.5 3.5V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9.5L10.5 6V3Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10.5 6h3" />
      <path d="M9.5 13.5h5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco squeeze (ketchup, mostarda, maionese).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function KetchupBottleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l-1.5 4h3L12 2Z" />
      <rect x="7.5" y="6" width="9" height="14" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 12h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de saleiro / pimenteiro / tempero seco.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SaltShakerIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8.5 7a3.5 3.5 0 0 1 7 0H8.5Z" />
      <path d="M7.5 7h9l1.2 11a2 2 0 0 1-2 2H8.3a2 2 0 0 1-2-2L7.5 7Z" fill="currentColor" fillOpacity={0.12} />
      <circle cx="11" cy="5.5" r="0.4" fill="currentColor" />
      <circle cx="13" cy="5.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cápsula de café.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CoffeeCapsuleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 17h12l-1.5-9.5A2.5 2.5 0 0 0 14 5.5h-4a2.5 2.5 0 0 0-2.5 2L6 17Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M4.5 17h15" />
      <path d="M9.5 10h5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de sachê de chá.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function TeaBagIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 9l2-2h4l2 2v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 7V3.5" />
      <path d="M12 3.5h3.5" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de caixinha de suco / água de coco / achocolatado com canudo.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function JuiceBoxIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6.5" y="7" width="11" height="13" rx="1.8" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 7V3.5l3-1" />
      <circle cx="12" cy="13.5" r="2.2" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pão francês / pão de queijo.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CheeseBreadIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 15c0-4 3.5-7 8-7s8 3 8 7c0 2-1.5 3.5-3.5 3.5h-9C5.5 18.5 4 17 4 15Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M8.5 11.5l1.5 2" />
      <path d="M12 10.5l1.5 2" />
      <path d="M15.5 11.5l1 1.5" />
    </svg>
  );
}
