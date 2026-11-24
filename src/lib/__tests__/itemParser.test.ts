import { describe, expect, it } from 'vitest';
import { formatQuantity, parseMultiLineInput, parseSingleItem } from '../itemParser';
import { CATALOG_BY_CATEGORY, guessCategory } from '../dictionaryPtBr';
import { generateShareCode, getMinQuantityForUnit, getQuantityStep } from '../../db/localDb';
import { normalizeSpokenPortuguese } from '../speechParser';
import { getItemMonogram, resolveItemIcon } from '../itemIconMap';
import { serializeError } from '../logger';

describe('itemParser', () => {
  it('parses leading quantity and name', () => {
    const res = parseSingleItem('2 leite integral');
    expect(res).toEqual({
      name: 'Leite integral',
      normalizedName: 'leite integral',
      quantity: 2,
      unit: 'un',
    });
  });

  it('parses decimal weight with unit', () => {
    const res = parseSingleItem('1,5kg batata inglesa');
    expect(res).toEqual({
      name: 'Batata inglesa',
      normalizedName: 'batata inglesa',
      quantity: 1.5,
      unit: 'kg',
    });
  });

  it('parses trailing quantity and pharmacy unit', () => {
    const res = parseSingleItem('dipirona 500mg 2 cx');
    expect(res).toEqual({
      name: 'Dipirona 500mg',
      normalizedName: 'dipirona 500mg',
      quantity: 2,
      unit: 'cx',
    });
  });

  it('preserves leading pharmacy dosage as part of the item name', () => {
    expect(parseSingleItem('500mg dipirona')).toEqual({
      name: '500mg dipirona',
      normalizedName: '500mg dipirona',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('1000ui vitamina d 2 cx')).toEqual({
      name: '1000ui vitamina d',
      normalizedName: '1000ui vitamina d',
      quantity: 2,
      unit: 'cx',
    });
  });

  it('parses WhatsApp multi-line list with bullets and headers', () => {
    const whatsapp = `
      Lista de compras:
      - 2 leite integral
      • 500g queijo prato
      1. pão de forma
      [ ] dipirona 500mg 1 cx
    `;
    const items = parseMultiLineInput(whatsapp);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ name: 'Leite integral', quantity: 2, unit: 'un' });
    expect(items[1]).toMatchObject({ name: 'Queijo prato', quantity: 500, unit: 'g' });
    expect(items[2]).toMatchObject({ name: 'Pão de forma', quantity: 1, unit: 'un' });
    expect(items[3]).toMatchObject({ name: 'Dipirona 500mg', quantity: 1, unit: 'cx' });
  });

  it('protects product specifiers, numeric-leading brands, and zero quantity safely', () => {
    expect(parseSingleItem('Fralda tamanho 3')).toMatchObject({
      name: 'Fralda tamanho 3',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('Ômega 3')).toMatchObject({
      name: 'Ômega 3',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('Protetor solar FPS 50')).toMatchObject({
      name: 'Protetor solar FPS 50',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('3 Corações café')).toMatchObject({
      name: '3 Corações café',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('7 Belo bala')).toMatchObject({
      name: '7 Belo bala',
      quantity: 1,
      unit: 'un',
    });
    expect(parseSingleItem('0 leite')).toMatchObject({
      name: 'Leite',
      quantity: 1,
      unit: 'un',
    });
  });

  it('formats quantities nicely', () => {
    expect(formatQuantity(2, 'un')).toBe('2x');
    expect(formatQuantity(1.5, 'kg')).toBe('1,5kg');
    expect(formatQuantity(3, 'cx')).toBe('3 cx');
  });
});

describe('dictionaryPtBr', () => {
  it('categorizes common market and pharmacy items across 16 corridors', () => {
    expect(guessCategory('Banana prata')).toBe('hortifruti');
    expect(guessCategory('Leite integral')).toBe('laticinios');
    expect(guessCategory('Dipirona 500mg')).toBe('medicamentos');
    expect(guessCategory('Band-aid transparente')).toBe('primeiros_socorros');
    expect(guessCategory('Detergente neutro')).toBe('limpeza');
    expect(guessCategory('Papel alumínio')).toBe('utilidades');
    expect(guessCategory('Protetor solar facial')).toBe('dermocosmeticos');
    expect(guessCategory('Fralda Pampers M')).toBe('bebe');
    expect(guessCategory('Ração Golden cachorro')).toBe('pet');
  });

  it('provides an extensive catalog of 350+ items', () => {
    const total = Object.values(CATALOG_BY_CATEGORY).reduce((acc, arr) => acc + arr.length, 0);
    expect(total).toBeGreaterThanOrEqual(350);
  });

  it('matches whole phrases without false substring positives', () => {
    expect(guessCategory('Salsicha hot dog')).toBe('acougue');
    expect(guessCategory('Sal grosso churrasco')).toBe('mercearia');
  });

  it('respects user learned category override', () => {
    const overrides = new Map([['leite de aveia', 'mercearia' as const]]);
    expect(guessCategory('Leite de aveia', overrides)).toBe('mercearia');
  });
});

describe('generateShareCode', () => {
  it('generates an 8-char PEGA-XXXXXXXX code', () => {
    const code = generateShareCode();
    expect(code).toMatch(/^PEGA-[A-Z2-9]{8}$/);
  });
});

describe('speechParser', () => {
  it('normalizes spoken Portuguese quantities and splits multiple items', () => {
    const normalized = normalizeSpokenPortuguese(
      'dois leites integrais e uma caixa de dipirona, meio quilo de queijo prato'
    );
    const items = parseMultiLineInput(normalized);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ name: 'Leites integrais', quantity: 2, unit: 'un' });
    expect(items[1]).toMatchObject({ name: 'Dipirona', quantity: 1, unit: 'cx' });
    expect(items[2]).toMatchObject({ name: 'Queijo prato', quantity: 500, unit: 'g' });
  });

  it('handles compound "e meio" expressions and "mais" separator', () => {
    const normalized = normalizeSpokenPortuguese(
      'um quilo e meio de batata mais um litro e meio de suco'
    );
    const items = parseMultiLineInput(normalized);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ name: 'Batata', quantity: 1.5, unit: 'kg' });
    expect(items[1]).toMatchObject({ name: 'Suco', quantity: 1.5, unit: 'L' });
  });

  it('converts "meia" only before compatible units and preserves "meia branca"', () => {
    const eggs = parseMultiLineInput(normalizeSpokenPortuguese('meia dúzia de ovos'));
    expect(eggs[0]).toMatchObject({ name: 'Ovos', quantity: 0.5, unit: 'dz' });

    const socks = parseMultiLineInput(normalizeSpokenPortuguese('meia branca'));
    expect(socks[0]).toMatchObject({ name: 'Meia branca', quantity: 1, unit: 'un' });
  });
});

describe('getQuantityStep', () => {
  it('returns symmetric unit-aware steps for g, ml, kg, L and un', () => {
    expect(getQuantityStep('g', 50, 'inc')).toBe(50);
    expect(getQuantityStep('g', 100, 'inc')).toBe(100);
    expect(getQuantityStep('g', 500, 'inc')).toBe(100);
    expect(getQuantityStep('g', 200, 'dec')).toBe(100);
    expect(getQuantityStep('g', 100, 'dec')).toBe(50);
    expect(getQuantityStep('kg', 0.5, 'inc')).toBe(0.5);
    expect(getQuantityStep('kg', 1, 'inc')).toBe(1);
    expect(getQuantityStep('kg', 1, 'dec')).toBe(0.5);
    expect(getQuantityStep('kg', 2, 'dec')).toBe(1);
    expect(getQuantityStep('kg', 1.5, 'inc')).toBe(0.5);
    expect(getQuantityStep('un', 3, 'inc')).toBe(1);
    expect(getMinQuantityForUnit('g')).toBe(50);
    expect(getMinQuantityForUnit('kg')).toBe(0.5);
    expect(getMinQuantityForUnit('un')).toBe(1);
  });
});

describe('itemIconMap', () => {
  it('maps specific products to pure minimalist vector SVGs (zero emojis)', () => {
    expect(resolveItemIcon('Manga')).toEqual({ kind: 'svg', key: 'mango' });
    expect(resolveItemIcon('Kiwi')).toEqual({ kind: 'svg', key: 'kiwi' });
    expect(resolveItemIcon('Pera')).toEqual({ kind: 'svg', key: 'pear' });
    expect(resolveItemIcon('Tomate italiano')).toEqual({ kind: 'svg', key: 'tomato' });
    expect(resolveItemIcon('Cebola roxa')).toEqual({ kind: 'svg', key: 'onion' });
    expect(resolveItemIcon('Alho')).toEqual({ kind: 'svg', key: 'garlic' });
    expect(resolveItemIcon('Batata inglesa')).toEqual({ kind: 'svg', key: 'potato' });
    expect(resolveItemIcon('Abacaxi')).toEqual({ kind: 'svg', key: 'pineapple' });
    expect(resolveItemIcon('Abacate')).toEqual({ kind: 'svg', key: 'avocado' });
    expect(resolveItemIcon('Melancia')).toEqual({ kind: 'svg', key: 'watermelon' });
    expect(resolveItemIcon('Linguiça toscana')).toEqual({ kind: 'svg', key: 'sausage' });
    expect(resolveItemIcon('Peito de frango')).toEqual({ kind: 'svg', key: 'drumstick' });
    expect(resolveItemIcon('Tilápia')).toEqual({ kind: 'svg', key: 'fish' });
    expect(resolveItemIcon('Atum em lata')).toEqual({ kind: 'svg', key: 'fish' });
    expect(resolveItemIcon('Carvão')).toEqual({ kind: 'svg', key: 'flame' });
    expect(resolveItemIcon('Fralda M')).toEqual({ kind: 'svg', key: 'diaper' });
    expect(resolveItemIcon('Sorine spray nasal')).toEqual({ kind: 'svg', key: 'nasal_spray' });
    expect(resolveItemIcon('Colírio lubrificante')).toEqual({ kind: 'svg', key: 'eye_drops' });
    expect(resolveItemIcon('Desodorante aerosol')).toEqual({ kind: 'svg', key: 'deodorant' });
    expect(resolveItemIcon('Fita adesiva')).toEqual({ kind: 'svg', key: 'tape_roll' });
    expect(resolveItemIcon('Chuchu')).toEqual({ kind: 'svg', key: 'chayote' });
    expect(resolveItemIcon('Mamão')).toEqual({ kind: 'svg', key: 'papaya' });
    expect(resolveItemIcon('Tapioca')).toEqual({ kind: 'svg', key: 'tapioca' });
    expect(resolveItemIcon('Whey protein')).toEqual({ kind: 'svg', key: 'supplement_tub' });
    expect(resolveItemIcon('Teste de gravidez')).toEqual({ kind: 'svg', key: 'rapid_test' });
    expect(resolveItemIcon('Adaptador USB desconhecido')).toEqual({ kind: 'monogram' });
  });

  it('guarantees 100% minimalist SVG icon coverage across every item in CATALOG_BY_CATEGORY', () => {
    const missing: string[] = [];
    for (const items of Object.values(CATALOG_BY_CATEGORY)) {
      for (const item of items) {
        if (resolveItemIcon(item).kind !== 'svg') {
          missing.push(item);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('builds clean monograms for unknown custom items', () => {
    expect(getItemMonogram('Adaptador USB')).toBe('AU');
    expect(getItemMonogram('Cadeado')).toBe('CA');
    expect(getItemMonogram('Chuchu')).toBe('CH');
  });

  it('avoids false substring collisions on whole words and prefers longer phrases', () => {
    expect(resolveItemIcon('Queijo provolone')).toEqual({ kind: 'svg', key: 'cheese_wedge' });
    expect(resolveItemIcon('Luva descartável')).toEqual({ kind: 'svg', key: 'hand' });
    expect(resolveItemIcon('Salsicha hot dog')).toEqual({ kind: 'svg', key: 'sausage' });
    expect(resolveItemIcon('Bolacha cream cracker')).toEqual({ kind: 'svg', key: 'cookie' });
    expect(resolveItemIcon('Lasanha bolonhesa')).toEqual({ kind: 'svg', key: 'pasta_bowl' });
    expect(resolveItemIcon('Água sanitária')).toEqual({ kind: 'svg', key: 'detergent_bottle' });
    expect(resolveItemIcon('Papel higiênico')).toEqual({ kind: 'svg', key: 'toilet_paper' });
    expect(resolveItemIcon('Pasta de dente Colgate')).toEqual({ kind: 'svg', key: 'toothpaste' });
    expect(resolveItemIcon('Arroz branco')).toEqual({ kind: 'svg', key: 'rice_bag' });
  });
});

describe('logger', () => {
  it('serializes Error instances, PostgREST error objects, and primitive values safely', () => {
    const err = new TypeError('Falha de rede');
    expect(serializeError(err)).toEqual({ name: 'TypeError', message: 'Falha de rede' });

    expect(
      serializeError({
        code: '42501',
        message: 'permission denied',
        details: 'RLS',
        hint: 'Grant privileges',
      })
    ).toEqual({
      code: '42501',
      message: 'permission denied',
      details: 'RLS',
      hint: 'Grant privileges',
    });

    expect(serializeError('erro simples')).toEqual({ message: 'erro simples' });
    expect(serializeError(null)).toEqual({ message: 'null' });
  });
});
