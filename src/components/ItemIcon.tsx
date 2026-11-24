import { memo, type ComponentType } from 'react';
import {
  Apple,
  Baby,
  Banana,
  Bandage,
  Bath,
  Battery,
  Bean,
  Beef,
  Beer,
  Bone,
  Brush,
  Cake,
  CakeSlice,
  Candy,
  Carrot,
  Cat,
  Check,
  Cherry,
  Citrus,
  ClipboardList,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Dog,
  Donut,
  Droplet,
  Droplets,
  Drumstick,
  Egg,
  Eye,
  Fish,
  Flame,
  Flower2,
  GlassWater,
  Grape,
  Ham,
  Hand,
  IceCreamBowl,
  IceCreamCone,
  Leaf,
  LeafyGreen,
  Lightbulb,
  Lollipop,
  Martini,
  Milk,
  MilkOff,
  Nut,
  Package,
  PawPrint,
  Pill,
  PillBottle,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Scissors,
  ShieldPlus,
  ShoppingBasket,
  ShoppingCart,
  Snowflake,
  Soup,
  Sparkles,
  SprayCan,
  Stethoscope,
  Sun,
  Syringe,
  Thermometer,
  Toilet,
  Trash2,
  Utensils,
  Vegan,
  Wheat,
  Wine,
} from 'lucide-react';
import type { CategoryId, ListType } from '../types';
import {
  CATEGORY_ICON_THEME,
  getItemMonogram,
  getProductColorTheme,
  resolveItemIcon,
  type VectorIconKey,
} from '../lib/itemIconMap';
import {
  BreadLoafIcon,
  ButterDishIcon,
  CheeseWedgeIcon,
  DetergentBottleIcon,
  DiaperIcon,
  EyeDropsIcon,
  LaundryBoxIcon,
  NasalSprayIcon,
  PastaBowlIcon,
  RiceBagIcon,
  SodaCanIcon,
  SpongeIcon,
  ToiletPaperIcon,
  ToothbrushIcon,
  ToothpasteIcon,
} from './CustomProductIcons';
import {
  AvocadoIcon,
  BellPepperIcon,
  BroccoliIcon,
  CoconutIcon,
  CornIcon,
  CucumberIcon,
  EggplantIcon,
  GarlicIcon,
  KiwiIcon,
  MangoIcon,
  MushroomIcon,
  OnionIcon,
  PearIcon,
  PineappleIcon,
  PotatoIcon,
  TomatoIcon,
  WatermelonIcon,
} from './icons/ProduceIcons';
import {
  BaconIcon,
  BurgerIcon,
  CheeseBreadIcon,
  CoffeeCapsuleIcon,
  JamJarIcon,
  JuiceBoxIcon,
  KetchupBottleIcon,
  MilkCartonIcon,
  OliveOilBottleIcon,
  SaltShakerIcon,
  SausageIcon,
  TeaBagIcon,
  YogurtCupIcon,
} from './icons/FoodIcons';
import {
  BroomIcon,
  CottonSwabIcon,
  DeodorantIcon,
  MouthwashIcon,
  NailPolishIcon,
  PerfumeBottleIcon,
  RazorIcon,
  SanitaryPadIcon,
  ShampooBottleIcon,
  SoapBarIcon,
  SunscreenTubeIcon,
} from './icons/CareIcons';
import {
  BabyBottleIcon,
  BandageRollIcon,
  CatLitterIcon,
  FoilRollIcon,
  HangerIcon,
  PacifierIcon,
  PetFoodBagIcon,
  PillBlisterIcon,
  SurgicalMaskIcon,
  SyrupBottleIcon,
} from './icons/HealthHomeIcons';
import {
  AerosolSprayIcon,
  BakingPowderIcon,
  BeetIcon,
  CassavaIcon,
  ChayoteIcon,
  CondomPackIcon,
  GingerIcon,
  GlueTubeIcon,
  HotWaterBagIcon,
  PapayaIcon,
  PassionFruitIcon,
  PastryRollIcon,
  PopsicleIcon,
  ProbioticAmpouleIcon,
  RapidTestIcon,
  SerumDropperIcon,
  SupplementTubIcon,
  TapeRollIcon,
  TapiocaIcon,
  ToothpickBoxIcon,
  TweezersIcon,
  WhippedCreamIcon,
} from './icons/ExtraProductIcons';

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>;

const VECTOR_ICON_COMPONENTS: Record<VectorIconKey, IconComponent> = {
  aerosol_spray: AerosolSprayIcon,
  apple: Apple,
  avocado: AvocadoIcon,
  baby: Baby,
  baby_bottle: BabyBottleIcon,
  bacon: BaconIcon,
  baking_powder: BakingPowderIcon,
  banana: Banana,
  bandage: Bandage,
  bandage_roll: BandageRollIcon,
  bath: Bath,
  battery: Battery,
  bean: Bean,
  beef: Beef,
  beer: Beer,
  beet: BeetIcon,
  bell_pepper: BellPepperIcon,
  bone: Bone,
  bread_loaf: BreadLoafIcon,
  broccoli: BroccoliIcon,
  broom: BroomIcon,
  brush: Brush,
  burger: BurgerIcon,
  butter_dish: ButterDishIcon,
  cake: Cake,
  cake_slice: CakeSlice,
  candy: Candy,
  carrot: Carrot,
  cassava: CassavaIcon,
  cat: Cat,
  cat_litter: CatLitterIcon,
  chayote: ChayoteIcon,
  cheese_bread: CheeseBreadIcon,
  cheese_wedge: CheeseWedgeIcon,
  cherry: Cherry,
  citrus: Citrus,
  coconut: CoconutIcon,
  coffee: Coffee,
  coffee_capsule: CoffeeCapsuleIcon,
  condom_pack: CondomPackIcon,
  cookie: Cookie,
  corn: CornIcon,
  cotton_swab: CottonSwabIcon,
  croissant: Croissant,
  cucumber: CucumberIcon,
  deodorant: DeodorantIcon,
  detergent_bottle: DetergentBottleIcon,
  diaper: DiaperIcon,
  dog: Dog,
  donut: Donut,
  droplet: Droplet,
  droplets: Droplets,
  drumstick: Drumstick,
  egg: Egg,
  eggplant: EggplantIcon,
  eye: Eye,
  eye_drops: EyeDropsIcon,
  fish: Fish,
  flame: Flame,
  flower: Flower2,
  foil_roll: FoilRollIcon,
  garlic: GarlicIcon,
  ginger: GingerIcon,
  glue_tube: GlueTubeIcon,
  grape: Grape,
  ham: Ham,
  hand: Hand,
  hanger: HangerIcon,
  hot_water_bag: HotWaterBagIcon,
  ice_cream_bowl: IceCreamBowl,
  ice_cream_cone: IceCreamCone,
  jam_jar: JamJarIcon,
  juice_box: JuiceBoxIcon,
  ketchup_bottle: KetchupBottleIcon,
  kiwi: KiwiIcon,
  laundry_box: LaundryBoxIcon,
  leaf: Leaf,
  leafy_green: LeafyGreen,
  lightbulb: Lightbulb,
  lollipop: Lollipop,
  mango: MangoIcon,
  martini: Martini,
  milk: Milk,
  milk_carton: MilkCartonIcon,
  milk_off: MilkOff,
  mouthwash: MouthwashIcon,
  mushroom: MushroomIcon,
  nail_polish: NailPolishIcon,
  nasal_spray: NasalSprayIcon,
  nut: Nut,
  olive_oil_bottle: OliveOilBottleIcon,
  onion: OnionIcon,
  pacifier: PacifierIcon,
  package: Package,
  papaya: PapayaIcon,
  passion_fruit: PassionFruitIcon,
  pasta_bowl: PastaBowlIcon,
  pastry_roll: PastryRollIcon,
  paw: PawPrint,
  pear: PearIcon,
  perfume_bottle: PerfumeBottleIcon,
  pet_food_bag: PetFoodBagIcon,
  pill: Pill,
  pill_blister: PillBlisterIcon,
  pill_bottle: PillBottle,
  pineapple: PineappleIcon,
  pizza: Pizza,
  popcorn: Popcorn,
  popsicle: PopsicleIcon,
  potato: PotatoIcon,
  probiotic_ampoule: ProbioticAmpouleIcon,
  rapid_test: RapidTestIcon,
  razor: RazorIcon,
  rice_bag: RiceBagIcon,
  salad: Salad,
  salt_shaker: SaltShakerIcon,
  sandwich: Sandwich,
  sanitary_pad: SanitaryPadIcon,
  sausage: SausageIcon,
  scissors: Scissors,
  serum_dropper: SerumDropperIcon,
  shampoo_bottle: ShampooBottleIcon,
  shield_plus: ShieldPlus,
  snowflake: Snowflake,
  soap_bar: SoapBarIcon,
  soda: CupSoda,
  soda_can: SodaCanIcon,
  soup: Soup,
  sparkles: Sparkles,
  sponge: SpongeIcon,
  spray: SprayCan,
  stethoscope: Stethoscope,
  sun: Sun,
  sunscreen_tube: SunscreenTubeIcon,
  supplement_tub: SupplementTubIcon,
  surgical_mask: SurgicalMaskIcon,
  syringe: Syringe,
  syrup_bottle: SyrupBottleIcon,
  tape_roll: TapeRollIcon,
  tapioca: TapiocaIcon,
  tea_bag: TeaBagIcon,
  thermometer: Thermometer,
  toilet: Toilet,
  toilet_paper: ToiletPaperIcon,
  tomato: TomatoIcon,
  toothbrush: ToothbrushIcon,
  toothpaste: ToothpasteIcon,
  toothpick_box: ToothpickBoxIcon,
  trash: Trash2,
  tweezers: TweezersIcon,
  utensils: Utensils,
  vegan: Vegan,
  water: GlassWater,
  watermelon: WatermelonIcon,
  wheat: Wheat,
  whipped_cream: WhippedCreamIcon,
  wine: Wine,
  yogurt_cup: YogurtCupIcon,
};

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
  const resolved = resolveItemIcon(name);
  const iconKey = resolved.kind === 'svg' ? resolved.key : null;
  const theme = getProductColorTheme(iconKey, categoryId);

  if (size === 'chip') {
    if (resolved.kind === 'svg') {
      const SvgIcon = VECTOR_ICON_COMPONENTS[resolved.key];
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
        {getItemMonogram(name)}
      </span>
    );
  }

  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
        isChecked
          ? 'border-emerald-500/40 bg-emerald-500/15 dark:border-emerald-500/35 dark:bg-emerald-500/15'
          : theme.badgeClass
      }`}
      aria-hidden="true"
    >
      {resolved.kind === 'svg' ? (
        (() => {
          const SvgIcon = VECTOR_ICON_COMPONENTS[resolved.key];
          return (
            <SvgIcon
              className={`h-5 w-5 transition ${
                isChecked ? 'text-emerald-600 opacity-75 dark:text-emerald-400' : theme.strokeClass
              }`}
              strokeWidth={1.8}
            />
          );
        })()
      ) : (
        <span
          className={`text-xs font-extrabold tracking-tight ${
            isChecked ? 'text-emerald-600 opacity-75 dark:text-emerald-400' : theme.strokeClass
          }`}
        >
          {getItemMonogram(name)}
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
