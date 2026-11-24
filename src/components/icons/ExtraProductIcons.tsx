import type { CustomSvgIconProps } from '../CustomProductIcons';

/**
 * Ícone minimalista duotone de mamão partido ao meio com sementes centrais.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PapayaIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3c-3.5 0-6 4.5-6 9.5S8.5 21 12 21s6-3.5 6-8.5S15.5 3 12 3Z" fill="currentColor" fillOpacity={0.12} />
      <ellipse cx="12" cy="13.5" rx="2.5" ry="4" />
      <circle cx="12" cy="11.5" r="0.6" fill="currentColor" />
      <circle cx="12" cy="13.5" r="0.6" fill="currentColor" />
      <circle cx="12" cy="15.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de maracujá partido com polpa e sementes.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PassionFruitIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="12" r="5" />
      <circle cx="10.5" cy="11" r="0.6" fill="currentColor" />
      <circle cx="13.5" cy="11" r="0.6" fill="currentColor" />
      <circle cx="12" cy="13.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de beterraba com folhas e raiz.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BeetIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8c-3.8 0-6.5 2.5-6.5 5.8C5.5 17 8.5 19 12 21c3.5-2 6.5-4 6.5-7.2C18.5 10.5 15.8 8 12 8Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 8V3.5" />
      <path d="M12 8L8.5 4.5" />
      <path d="M12 8l3.5-3.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de chuchu.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ChayoteIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4c-2.5 0-3.5 3-5 6.5-1.2 3-1 6.5 1 8.2 1.2 1 2.5 1.3 4 1.3s2.8-.3 4-1.3c2-1.7 2.2-5.2 1-8.2C15.5 7 14.5 4 12 4Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 4V2.5" />
      <path d="M12 7v11" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de raiz de mandioca / aipim.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CassavaIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18.5 5.5c1.5 1.5 1 4-1.5 6.5l-5 5c-2.5 2.5-5 3-6.5 1.5s-1-4 1.5-6.5l5-5c2.5-2.5 5-3 6.5-1.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 10l4 4" />
      <path d="M13 7l3 3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de raiz ramificada de gengibre.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function GingerIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 14a3 3 0 0 1 2-5.2V6a2 2 0 1 1 4 0v2.5h1.5a2.5 2.5 0 0 1 2.2 3.7A3 3 0 0 1 15 18H9.5A3 3 0 0 1 7 14Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 13h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de tapioca dobrada em meia-lua.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function TapiocaIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.5 16.5a8.5 8.5 0 0 1 17 0H3.5Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M6 16.5c1.5-2.5 10.5-2.5 12 0" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de espiral de chantilly.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function WhippedCreamIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4c1 2.5 4 3 4 5.5 0 1.2-.8 2-2 2.2 2 .5 3.5 1.8 3.5 3.8 0 2.2-2.2 3.5-5.5 3.5s-5.5-1.3-5.5-3.5c0-2 1.5-3.3 3.5-3.8-1.2-.2-2-1-2-2.2C8 7 11 6.5 12 4Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M8.5 14.5h7" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de massa de pastel / pastel com borda frisada.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PastryRollIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="7" width="16" height="10" rx="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M7 7v10" />
      <path d="M17 7v10" />
      <path d="M10 11.5h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de potinho de fermento em pó.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function BakingPowderIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="4" width="12" height="3.5" rx="1" />
      <rect x="7" y="7.5" width="10" height="12.5" rx="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 11.5v4" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de picolé no palito.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function PopsicleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 8a4 4 0 0 1 8 0v7a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 15V8Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 16.5V21" />
      <path d="M10.5 8v5" />
      <path d="M13.5 8v5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de lata de spray aerosol (inseticida, odorizador, antisséptico spray).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function AerosolSprayIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="7" y="8" width="8" height="13" rx="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M9 8V5h4v3" />
      <path d="M15.5 5.5h3" />
      <path d="M17.5 3.5l2-1" />
      <path d="M17.5 7.5l2 1" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de porta-palitos de dente.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ToothpickBoxIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="7" y="9" width="10" height="11" rx="2" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 9V4" />
      <path d="M12 9V3" />
      <path d="M14 9V4.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de rolo de fita adesiva / durex.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function TapeRollIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10.5" cy="12" r="6.5" fill="currentColor" fillOpacity={0.12} />
      <circle cx="10.5" cy="12" r="2.5" />
      <path d="M10.5 18.5h9.5l-1-3h-3.5" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de bisnaga de super cola com bico fino.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function GlueTubeIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l-1.5 4h3L12 3Z" />
      <path d="M8.5 7h7l1 13h-9l1-13Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10.5 13h3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de frasco de sérum facial com pipeta conta-gotas (ácido hialurônico, retinol, niacinamida).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SerumDropperIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.5 3h3v3h-3z" />
      <path d="M9.5 6h5v2.5h-5z" />
      <rect x="7.5" y="8.5" width="9" height="12" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 12v4.5" />
      <circle cx="12" cy="17.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pinça.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function TweezersIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 4L6 18" />
      <path d="M20 6L8 20" />
      <path d="M18 4a1.5 1.5 0 0 1 2 2" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de flaconete/ampola de probiótico.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function ProbioticAmpouleIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 3h4v3l2 3v9a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 18V9l2-3V3Z" fill="currentColor" fillOpacity={0.12} />
      <path d="M8 13h8" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de pote largo de suplemento (whey protein, creatina, colágeno).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function SupplementTubIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6" y="4" width="12" height="3.5" rx="1" />
      <rect x="5" y="7.5" width="14" height="12.5" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <path d="M12.5 11l-2 3h3l-2 3" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de bolsa térmica de água quente/fria.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function HotWaterBagIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.5 3h5l-1 3.5h-3L9.5 3Z" />
      <rect x="6" y="6.5" width="12" height="14" rx="4" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 12h4" />
      <path d="M10 15h4" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de embalagem de preservativo.
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function CondomPackIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="12" r="3.8" />
    </svg>
  );
}

/**
 * Ícone minimalista duotone de cassete de teste rápido (teste de gravidez, teste covid).
 *
 * @param props - Propriedades SVG e espessura de traço.
 * @returns Elemento `<svg>` line-art.
 */
export function RapidTestIcon({ strokeWidth = 1.8, ...props }: CustomSvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="8" y="3" width="8" height="18" rx="2.5" fill="currentColor" fillOpacity={0.12} />
      <rect x="10.2" y="6.5" width="3.6" height="6" rx="0.8" />
      <path d="M10.5 8.8h3" />
      <path d="M10.5 10.8h3" />
      <circle cx="12" cy="16.5" r="1.2" />
    </svg>
  );
}
