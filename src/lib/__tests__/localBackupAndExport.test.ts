import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addItemsFromText,
  clearPriceComparisonCaches,
  clearUserDictionary,
  createList,
  db,
  deleteCheckedItems,
  duplicateList,
  getLocalDataStats,
  restoreDeletedItems,
  savePriceComparisonCache,
  toggleItemChecked,
} from '../../db/localDb';
import { CATEGORY_MAP } from '../categories';
import { formatPendingListForShare } from '../listTextExport';
import { exportLocalBackup, importLocalBackup, validateBackupPayload } from '../localBackup';

describe('localBackup, selective cleanup, duplicateList & listTextExport', () => {
  beforeEach(async () => {
    await Promise.all([
      db.lists.clear(),
      db.items.clear(),
      db.dictionary.clear(),
      db.pendingSync.clear(),
      db.priceComparisons.clear(),
    ]);
  });

  it('deletes checked items in batch and restores them via restoreDeletedItems', async () => {
    const list = await createList('Mercado', 'mercado');
    const added = await addItemsFromText(list.id, '2 leite\n1 arroz\n3 banana');
    await toggleItemChecked(added[0]);
    await toggleItemChecked(added[1]);

    const removed = await deleteCheckedItems(list.id);
    expect(removed).toHaveLength(2);
    expect(await db.items.where('listId').equals(list.id).count()).toBe(1);

    await restoreDeletedItems(removed);
    expect(await db.items.where('listId').equals(list.id).count()).toBe(3);
  });

  it('duplicates a list with all items reset to pending', async () => {
    const list = await createList('Churrasco', 'mercado');
    const added = await addItemsFromText(list.id, '2kg picanha\n1 carvao');
    await toggleItemChecked(added[0]);

    const copy = await duplicateList(list.id);
    expect(copy).not.toBeNull();
    expect(copy!.name).toBe('Churrasco (cópia)');
    expect(copy!.id).not.toBe(list.id);
    expect(copy!.isShared).toBe(false);

    const copyItems = await db.items.where('listId').equals(copy!.id).toArray();
    expect(copyItems).toHaveLength(2);
    expect(copyItems.every((i) => !i.isChecked && i.checkedAt === null)).toBe(true);
  });

  it('exports, validates, and imports local backup in merge and replace modes', async () => {
    const list = await createList('Farmácia', 'farmacia');
    await addItemsFromText(list.id, '2 dipirona\n1 algodao');

    const backup = await exportLocalBackup();
    const valid = validateBackupPayload(backup);
    expect(valid.ok).toBe(true);
    if (!valid.ok) return;

    // Merge mode keeps existing list and imports copy with fresh IDs
    const mergeResult = await importLocalBackup(valid.data, 'merge');
    expect(mergeResult.listsImported).toBe(1);
    expect(mergeResult.itemsImported).toBe(2);
    expect(await db.lists.count()).toBe(2);
    expect(await db.items.count()).toBe(4);

    // Replace mode clears existing lists and restores only backup content
    const replaceResult = await importLocalBackup(valid.data, 'replace');
    expect(replaceResult.listsImported).toBe(1);
    expect(replaceResult.itemsImported).toBe(2);
    expect(await db.lists.count()).toBe(1);
    expect(await db.items.count()).toBe(2);
  });

  it('rejects invalid backup payloads', () => {
    expect(validateBackupPayload(null).ok).toBe(false);
    expect(validateBackupPayload({ app: 'other', version: 1, lists: [], items: [] }).ok).toBe(false);
    expect(validateBackupPayload({ app: 'pegala', version: 1, lists: [], items: [] }).ok).toBe(false);
  });

  it('reports local stats and clears price caches and dictionary selectively', async () => {
    const list = await createList('Mercado', 'mercado');
    await addItemsFromText(list.id, '1 arroz');
    await savePriceComparisonCache({
      listId: list.id,
      locationKey: '01310100:3',
      locationLabel: 'Centro',
      cepPrefix: '01310',
      radiusKm: 3,
      stores: [],
      candidates: [],
      failedChains: [],
      computedAt: new Date().toISOString(),
    });

    const before = await getLocalDataStats();
    expect(before.lists).toBe(1);
    expect(before.items).toBe(1);
    expect(before.dictionary).toBeGreaterThanOrEqual(1);
    expect(before.priceCaches).toBe(1);

    expect(await clearPriceComparisonCaches()).toBe(1);
    expect(await clearUserDictionary()).toBeGreaterThanOrEqual(1);

    const after = await getLocalDataStats();
    expect(after.lists).toBe(1);
    expect(after.items).toBe(1);
    expect(after.dictionary).toBe(0);
    expect(after.priceCaches).toBe(0);
  });

  it('formats pending list grouped by aisle for WhatsApp copy', async () => {
    const list = await createList('Mercado', 'mercado');
    const items = await addItemsFromText(list.id, '2kg batata\n1 leite');
    const text = formatPendingListForShare('Mercado', [
      { category: CATEGORY_MAP.hortifruti, items: [items[0]] },
      { category: CATEGORY_MAP.laticinios, items: [items[1]] },
    ]);

    expect(text).toContain('*Mercado* (2 itens)');
    expect(text).toContain(`*${CATEGORY_MAP.hortifruti.label}*`);
    expect(text).toContain('- 2kg Batata');
    expect(text).toContain(`*${CATEGORY_MAP.laticinios.label}*`);
    expect(text).toContain('- 1x Leite');
  });
});
