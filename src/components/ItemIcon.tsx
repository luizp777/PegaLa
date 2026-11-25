import { memo, useEffect, useState, type ComponentType } from 'react';
import {
  Baby,
  Bandage,
  Bath,
  Beef,
  Check,
  ClipboardList,
  Croissant,
  CupSoda,
  Flower2,
  Milk,
  Package,
  PawPrint,
  Pill,
  ShoppingBasket,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Utensils,
} from 'lucide-react';
import type { CategoryId, ListType } from '../types';

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>;
type ProductIconPackModule = typeof import('./ProductIconPack');

interface CategoryIconTheme {
  badgeClass: string;
  strokeClass: string;
}

const CATEGORY_ICON_THEME: Record<CategoryId, CategoryIconTheme> = {
  hortifruti: {
    badgeClass: 'bg-emerald-500/12 border-emerald-500/25 dark:bg-emerald-500/15 dark:border-emerald-400/25',
    strokeClass: 'text-emerald-600 dark:text-emerald-400',
  },
  padaria: {
    badgeClass: 'bg-amber-500/12 border-amber-500/25 dark:bg-amber-500/15 dark:border-amber-400/25',
    strokeClass: 'text-amber-600 dark:text-amber-400',
  },
  laticinios: {
    badgeClass: 'bg-yellow-500/12 border-yellow-500/30 dark:bg-yellow-500/15 dark:border-yellow-400/25',
    strokeClass: 'text-yellow-700 dark:text-yellow-400',
  },
  acougue: {
    badgeClass: 'bg-rose-500/12 border-rose-500/25 dark:bg-rose-500/15 dark:border-rose-400/25',
    strokeClass: 'text-rose-600 dark:text-rose-400',
  },
  mercearia: {
    badgeClass: 'bg-orange-500/12 border-orange-500/25 dark:bg-orange-500/15 dark:border-orange-400/25',
    strokeClass: 'text-orange-600 dark:text-orange-400',
  },
  congelados: {
    badgeClass: 'bg-sky-500/12 border-sky-500/25 dark:bg-sky-500/15 dark:border-sky-400/25',
    strokeClass: 'text-sky-600 dark:text-sky-400',
  },
  bebidas: {
    badgeClass: 'bg-blue-500/12 border-blue-500/25 dark:bg-blue-500/15 dark:border-blue-400/25',
    strokeClass: 'text-blue-600 dark:text-blue-400',
  },
  limpeza: {
    badgeClass: 'bg-cyan-500/12 border-cyan-500/25 dark:bg-cyan-500/15 dark:border-cyan-400/25',
    strokeClass: 'text-cyan-600 dark:text-cyan-400',
  },
  utilidades: {
    badgeClass: 'bg-slate-500/12 border-slate-500/25 dark:bg-slate-500/15 dark:border-slate-400/25',
    strokeClass: 'text-slate-600 dark:text-slate-400',
  },
  higiene: {
    badgeClass: 'bg-teal-500/12 border-teal-500/25 dark:bg-teal-500/15 dark:border-teal-400/25',
    strokeClass: 'text-teal-600 dark:text-teal-400',
  },
  dermocosmeticos: {
    badgeClass: 'bg-fuchsia-500/12 border-fuchsia-500/25 dark:bg-fuchsia-500/15 dark:border-fuchsia-400/25',
    strokeClass: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
  medicamentos: {
    badgeClass: 'bg-red-500/12 border-red-500/25 dark:bg-red-500/15 dark:border-red-400/25',
    strokeClass: 'text-red-600 dark:text-red-400',
  },
  primeiros_socorros: {
    badgeClass: 'bg-pink-500/12 border-pink-500/25 dark:bg-pink-500/15 dark:border-pink-400/25',
    strokeClass: 'text-pink-600 dark:text-pink-400',
  },
  bebe: {
    badgeClass: 'bg-violet-500/12 border-violet-500/25 dark:bg-violet-500/15 dark:border-violet-400/25',
    strokeClass: 'text-violet-600 dark:text-violet-400',
  },
  pet: {
    badgeClass: 'bg-purple-500/12 border-purple-500/25 dark:bg-purple-500/15 dark:border-purple-400/25',
    strokeClass: 'text-purple-600 dark:text-purple-400',
  },
  outros: {
    badgeClass: 'bg-zinc-500/10 border-zinc-400/30 dark:bg-zinc-500/15 dark:border-zinc-600/40',
    strokeClass: 'text-zinc-600 dark:text-zinc-400',
  },
};

let cachedIconPack: ProductIconPackModule | null = null;
let iconPackPromise: Promise<ProductIconPackModule | null> | null = null;

function loadProductIconPack(): Promise<ProductIconPackModule | null> {
  if (cachedIconPack) return Promise.resolve(cachedIconPack);
  if (!iconPackPromise) {
    iconPackPromise = import('./ProductIconPack')
      .then((m) => {
        cachedIconPack = m;
        return cachedIconPack;
      })
      .catch(() => {
        iconPackPromise = null;
        return null;
      });
  }
  return iconPackPromise;
}

const CATEGORY_VECTOR_ICONS: Record<CategoryId, IconComponent> = {
  hortifruti: ShoppingBasket,
  padaria: Croissant,
  laticinios: Milk,
  acougue: Beef,
  mercearia: Utensils,
  congelados: Snowflake,
  bebidas: CupSoda,
  limpeza: Sparkles,
  utilidades: Package,
  higiene: Bath,
  dermocosmeticos: Flower2,
  medicamentos: Pill,
  primeiros_socorros: Bandage,
  bebe: Baby,
  pet: PawPrint,
  outros: Package,
};

/**
 * Propriedades do componente {@link ItemIcon}.
 */
interface ItemIconProps {
  /** Nome do item usado para resolver o ícone vetorial minimalista ou monograma. */
  name: string;
  /** Categoria/corredor do item para paleta de cor suave do badge. */
  categoryId: CategoryId;
  /** Indica se o item está marcado como "No carrinho / Já tenho" (exibe badge verde de check). */
  isChecked?: boolean;
  /** Variante de tamanho: `'row'` (`40x40px` com badge) ou `'chip'` (compacto para catálogo/autocomplete). */
  size?: 'row' | 'chip';
  /** Quando `true` no modo `'chip'`, força contraste branco para chips ativos verdes. */
  inverted?: boolean;
}

/**
 * Renderiza exclusivamente ícones vetoriais minimalistas (line-art duotone com cor semântica do produto)
 * para todos os itens do catálogo, ou um Monograma Minimalista para itens personalizados desconhecidos.
 * Tanto as regras de mapeamento (`itemIconMap`) quanto o pacote de SVGs (`ProductIconPack`) são carregados
 * em chunk assíncrono separado após o primeiro paint, mantendo o ícone do corredor como fallback sem CLS.
 *
 * @param props - Propriedades visuais do ícone do item.
 * @returns Ícone vetorial minimalista renderizado.
 */
export const ItemIcon = memo(function ItemIcon({
  name,
  categoryId,
  isChecked = false,
  size = 'row',
  inverted = false,
}: ItemIconProps) {
  const [pack, setPack] = useState<ProductIconPackModule | null>(() => cachedIconPack);

  useEffect(() => {
    if (pack) return;
    let cancelled = false;
    void loadProductIconPack().then((loaded) => {
      if (!cancelled && loaded) {
        setPack(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pack]);

  const FallbackCategoryIcon = CATEGORY_VECTOR_ICONS[categoryId] ?? Package;
  const fallbackTheme = CATEGORY_ICON_THEME[categoryId] ?? CATEGORY_ICON_THEME.outros;

  const resolved = pack ? pack.resolveItemIcon(name) : null;
  const iconKey = resolved?.kind === 'svg' ? resolved.key : null;
  const theme = pack ? pack.getProductColorTheme(iconKey, categoryId) : fallbackTheme;

  if (size === 'chip') {
    if (!pack || resolved?.kind === 'svg') {
      const SvgIcon =
        pack && resolved?.kind === 'svg'
          ? pack.VECTOR_ICON_COMPONENTS[resolved.key]
          : FallbackCategoryIcon;
      return (
        <SvgIcon
          className={`h-4 w-4 shrink-0 ${inverted ? 'text-white' : theme.strokeClass}`}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      );
    }
    return (
      <span
        className={`flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-md px-1 text-[9px] font-extrabold leading-none ${
          inverted
            ? 'bg-white/25 text-white'
            : `${theme.badgeClass} border ${theme.strokeClass}`
        }`}
        aria-hidden="true"
      >
        {pack.getItemMonogram(name)}
      </span>
    );
  }

  const RowSvgIcon =
    !pack || resolved?.kind === 'svg'
      ? pack && resolved?.kind === 'svg'
        ? pack.VECTOR_ICON_COMPONENTS[resolved.key]
        : FallbackCategoryIcon
      : null;

  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
        isChecked
          ? 'border-emerald-500/40 bg-emerald-500/15 dark:border-emerald-500/35 dark:bg-emerald-500/15'
          : theme.badgeClass
      }`}
      aria-hidden="true"
    >
      {RowSvgIcon ? (
        <RowSvgIcon
          className={`h-5 w-5 transition ${
            isChecked ? 'text-emerald-600 opacity-75 dark:text-emerald-400' : theme.strokeClass
          }`}
          strokeWidth={1.8}
        />
      ) : (
        <span
          className={`text-xs font-extrabold tracking-tight ${
            isChecked ? 'text-emerald-600 opacity-75 dark:text-emerald-400' : theme.strokeClass
          }`}
        >
          {pack ? pack.getItemMonogram(name) : ''}
        </span>
      )}

      {isChecked && (
        <span className="animate-check-pop absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-2 ring-white dark:ring-zinc-900">
          <Check className="h-3 w-3 stroke-[3]" />
        </span>
      )}
    </span>
  );
});

/**
 * Propriedades do componente {@link CategoryIcon}.
 */
interface CategoryIconProps {
  /** Identificador do corredor/categoria. */
  categoryId: CategoryId;
  /** Tamanho do ícone vetorial (`'sm'` para cabeçalhos/abas ou `'lg'` para grade do seletor). */
  size?: 'sm' | 'lg';
  /** Quando `true`, aplica cor branca para contraste em botões ativos verdes. */
  inverted?: boolean;
}

/**
 * Renderiza o ícone vetorial minimalista representativo de um corredor/categoria.
 *
 * @param props - Propriedades visuais do ícone de categoria.
 * @returns Ícone SVG line-art da categoria.
 */
export function CategoryIcon({
  categoryId,
  size = 'sm',
  inverted = false,
}: CategoryIconProps) {
  const Icon = CATEGORY_VECTOR_ICONS[categoryId] ?? Package;
  const theme = CATEGORY_ICON_THEME[categoryId] ?? CATEGORY_ICON_THEME.outros;

  return (
    <Icon
      className={`${size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} shrink-0 ${
        inverted ? 'text-white' : theme.strokeClass
      }`}
      strokeWidth={1.85}
      aria-hidden="true"
    />
  );
}

/**
 * Propriedades do componente {@link ListTypeIcon}.
 */
interface ListTypeIconProps {
  /** Tipo operacional da lista (`mercado`, `farmacia` ou `geral`). */
  type: ListType;
  /** Classes Tailwind opcionais de tamanho e cor. */
  className?: string;
}

/**
 * Renderiza o ícone vetorial minimalista correspondente ao tipo de lista.
 *
 * @param props - Propriedades do ícone de tipo de lista.
 * @returns Ícone SVG line-art da lista.
 */
export function ListTypeIcon({ type, className = 'h-4 w-4' }: ListTypeIconProps) {
  if (type === 'farmacia') {
    return <Pill className={className} strokeWidth={1.85} aria-hidden="true" />;
  }
  if (type === 'geral') {
    return <ClipboardList className={className} strokeWidth={1.85} aria-hidden="true" />;
  }
  return <ShoppingCart className={className} strokeWidth={1.85} aria-hidden="true" />;
}
