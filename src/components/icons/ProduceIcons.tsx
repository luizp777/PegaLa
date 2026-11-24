import type { CustomSvgIconProps } from '../CustomProductIcons';

/**
 * Ícone minimalista duotone de tomate.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function TomatoIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 7c-4.5 0-8 2.8-8 7a6.5 6.5 0 0 0 6.5 6.5h3A6.5 6.5 0 0 0 20 14c0-4.2-3.5-7-8-7Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 7V3.5" />
      <path d="M9 5.5c1.5 1 4.5 1 6 0" />
      <path d="M8.5 11.5c-.8.8-1.2 1.8-1.2 3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cebola.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function OnionIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4c0 2.5-6 4.5-6 10a6 6 0 0 0 12 0c0-5.5-6-7.5-6-10Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 4V2.5" />
      <path d="M12 8c-2 2-3 4.5-3 7.5" />
      <path d="M12 8c2 2 3 4.5 3 7.5" />
      <path d="M10.5 20.5h3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cabeça de alho.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function GarlicIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3.5c-.8 2.2-1.8 3.2-3.5 4.2C6.2 9 5 11.2 5 14a5.5 5.5 0 0 0 5.5 5.5h3A5.5 5.5 0 0 0 19 14c0-2.8-1.2-5-3.5-6.3-1.7-1-2.7-2-3.5-4.2Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 7v12.5" />
      <path d="M9 10.5c-.6 1.5-.8 3.5-.4 6" />
      <path d="M15 10.5c.6 1.5.8 3.5.4 6" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de batata.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PotatoIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.5 7.5C4.5 9 3.5 13 5 16s5.5 4 9.5 2.5 5.5-5 4.5-8.5-5-4.5-8-4-2.5 1-3.5 1.5Z" fill="currentColor" fillOpacity={0.12} />
      <circle cx="9.5" cy="12" r="0.7" fill="currentColor" />
      <circle cx="14.5" cy="14" r="0.7" fill="currentColor" />
      <circle cx="13" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de abacaxi.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PineappleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="7" y="9" width="10" height="12" rx="4.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 9V3.5" />
      <path d="M12 9L8.5 5" />
      <path d="M12 9l3.5-4" />
      <path d="M8.5 13l7 4" />
      <path d="M15.5 13l-7 4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de fatia de melancia / melão.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function WatermelonIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.5 10.5a8.5 8.5 0 0 0 17 0H3.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M5.8 10.5a6.2 6.2 0 0 0 12.4 0" />
      <circle cx="9.5" cy="13" r="0.6" fill="currentColor" />
      <circle cx="12" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="13" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de abacate partido ao meio.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function AvocadoIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3c-2.5 0-4 3.5-5.2 6.5C5.6 12.5 5.5 16 7 18.5A5.8 5.8 0 0 0 12 21a5.8 5.8 0 0 0 5-2.5c1.5-2.5 1.4-6 .2-9C16 6.5 14.5 3 12 3Z" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="15" r="2.8" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pimentão.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BellPepperIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 7c-2.2 0-3.5 2-3.5 5 0 4.5 1.8 8 4.2 8 1.2 0 2-.6 3.3-.6s2.1.6 3.3.6c2.4 0 4.2-3.5 4.2-8 0-3-1.3-5-3.5-5-1.4 0-2.5.8-4 .8S9.4 7 8 7Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 7.5V4c0-.8.6-1.5 1.5-1.5" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de espiga de milho.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CornIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 5c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5v9c0 2-1.3 3.5-3 3.5S9 16 9 14V5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 12c-2.5 1.2-3.5 4.5-2.5 8 2.2-.5 4-2 5.5-2.5" />
      <path d="M15 12c2.5 1.2 3.5 4.5 2.5 8-2.2-.5-4-2-5.5-2.5" />
      <path d="M9.5 8h5" />
      <path d="M12 5v7" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de brócolis / couve-flor.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BroccoliIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 13a3.5 3.5 0 0 1-1-6.8A4 4 0 0 1 13.5 5a3.8 3.8 0 0 1 5.5 3.2A3.5 3.5 0 0 1 17 13Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 13l1 7.5h2l1-7.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pepino / abobrinha.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CucumberIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.5 4.5a3 3 0 0 1 2 5l-10 10a3 3 0 0 1-4.5-4l10-10a3 3 0 0 1 2.5-1Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M18.5 5.5l1.5-1.5" />
      <circle cx="13" cy="11" r="0.6" fill="currentColor" />
      <circle cx="10" cy="14" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de berinjela.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function EggplantIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 7.5c2 1 2.8 4 1.2 7.5-1.8 3.8-5.5 6-8.2 4.8-2.6-1.2-2.2-4.8.5-8.5 2-2.8 4.5-4.8 6.5-3.8Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M13 7.5c.8-1.5 2-2.5 3.5-3" />
      <path d="M11.5 8.5l4-1" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cogumelo / champignon.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function MushroomIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 13a7.5 7.5 0 0 1 15 0H4.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M9.5 13v5.5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V13" />
      <circle cx="9.5" cy="9.5" r="0.8" fill="currentColor" />
      <circle cx="14.5" cy="10" r="0.7" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de coco / coco verde.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CoconutIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="13" r="7" fill="currentColor" fillOpacity={0.12} />
      <path d="M14 9l2.5-5" />
      <path d="M16.5 4h2" />
      <ellipse cx="12" cy="9.5" rx="3.2" ry="1.2" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pera.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PearIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 6c-1.8 0-2.5 2-3.5 4.2C7.2 12.8 6 14.5 6 16.5a6 6 0 0 0 12 0c0-2-1.2-3.7-2.5-6.3C14.5 8 13.8 6 12 6Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 6V3.5" />
      <path d="M12 4.5c1.5-.8 2.8-.5 3.5.3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de manga.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function MangoIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 5.5c3 1 4.5 4.5 3 8.5-1.5 4-5.5 6.5-9 5.5-2.5-.8-3.5-3.5-2-7.5 1.5-4 5-7.5 8-6.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M14.5 5.5c.8-1.5 2-2 3.2-2" />
      <path d="M10 15c1.5-.5 3-2 3.8-4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de kiwi partido ao meio.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function KiwiIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity={0.12} />
      <ellipse cx="12" cy="12" rx="2.5" ry="3.2" />
      <circle cx="12" cy="7" r="0.5" fill="currentColor" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      <circle cx="7.5" cy="12" r="0.5" fill="currentColor" />
      <circle cx="16.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}
