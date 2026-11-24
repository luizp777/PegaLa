import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addItemsFromText,
  createList,
  db,
  decrementItemQuantity,
  deleteItem,
  ensureDefaultLists,
  incrementItemQuantity,
  leaveList,
  renameList,
  restoreDeletedItem,
  setItemExactQuantityAndUnit,
  toggleItemChecked,
  uncheckAllItems,
  updateItemDetails,
} from '../localDb';

describe('localDb (IndexedDB / Dexie)', () => {
  beforeEach(async () => {
    await db.lists.clear();
    await db.items.clear();
    await db.dictionary.clear();
    await db.pendingSync.clear();
  });

  it('seeds default lists atomically without duplicates under concurrent calls', async () => {
    const [id1, id2] = await Promise.all([ensureDefaultLists(), ensureDefaultLists()]);
    expect(id1).toBe(id2);
    const lists = await db.lists.toArray();
    expect(lists).toHaveLength(2);
    expect(lists.map((l) => l.name).sort()).toEqual(['Farmácia', 'Mercado']);
  });

  it('deduplicates items by normalized name, sums quantities, and coalesces pendingSync', async () => {
    const list = await createList('Mercado', 'mercado');
    const [first] = await addItemsFromText(list.id, '2 leite integral');
    expect(first.quantity).toBe(2);

    const [summed] = await addItemsFromText(list.id, '1 leite integral');
    expect(summed.id).toBe(first.id);
    expect(summed.quantity).toBe(3);

    await incrementItemQuantity(summed);
    await incrementItemQuantity({ ...summed, quantity: 4 });

    const pendingForItem = await db.pendingSync
      .where('listId')
      .equals(list.id)
      .filter((m) => m.entityId === first.id && m.action === 'upsert_item')
      .toArray();
    expect(pendingForItem).toHaveLength(1);
  });

  it('stops decrement at minimum without deleting and supports delete + undo restore', async () => {
    const list = await createList('Teste', 'geral');
    const [item] = await addItemsFromText(list.id, '50g presunto');
    await decrementItemQuantity(item);
    const stillThere = await db.items.get(item.id);
    expect(stillThere?.quantity).toBe(50);

    await deleteItem(item);
    expect(await db.items.get(item.id)).toBeUndefined();
    const deleteMuts = await db.pendingSync
      .where('listId')
      .equals(list.id)
      .filter((m) => m.entityId === item.id)
      .toArray();
    expect(deleteMuts.map((m) => m.action)).toEqual(['delete_item']);

    await restoreDeletedItem(item);
    expect(await db.items.get(item.id)).toBeDefined();
    const restoredMuts = await db.pendingSync
      .where('listId')
      .equals(list.id)
      .filter((m) => m.entityId === item.id)
      .toArray();
    expect(restoredMuts.map((m) => m.action)).toEqual(['upsert_item']);
  });

  it('reactivates all checked items via uncheckAllItems and enqueues leave_list on leaveList', async () => {
    const list = await createList('Compartilhada', 'mercado');
    const [a, b] = await addItemsFromText(list.id, 'Arroz\nFeijão');
    await toggleItemChecked(a);
    await toggleItemChecked(b);

    const reactivated = await uncheckAllItems(list.id);
    expect(reactivated).toBe(2);
    const items = await db.items.where('listId').equals(list.id).toArray();
    expect(items.every((i) => !i.isChecked)).toBe(true);

    await leaveList(list.id);
    expect(await db.lists.get(list.id)).toBeUndefined();
    const muts = await db.pendingSync.where('listId').equals(list.id).toArray();
    expect(muts.map((m) => m.action)).toEqual(['leave_list']);
  });

  it('updates full item details and renames a list with sync queueing', async () => {
    const list = await createList('Mercado', 'mercado');
    await renameList(list.id, 'Compras da Semana');
    const renamed = await db.lists.get(list.id);
    expect(renamed?.name).toBe('Compras da Semana');

    const [item] = await addItemsFromText(list.id, 'Leite');
    await updateItemDetails(item, {
      name: 'Leite sem lactose',
      quantity: 2,
      unit: 'L',
      categoryId: 'bebidas',
    });

    const updated = await db.items.get(item.id);
    expect(updated).toMatchObject({
      name: 'Leite sem lactose',
      normalizedName: 'leite sem lactose',
      quantity: 2,
      unit: 'L',
      categoryId: 'bebidas',
    });
  });

  it('merges duplicate items cleanly when renaming an item in updateItemDetails', async () => {
    const list = await createList('Mercado', 'mercado');
    const [arroz, leite] = await addItemsFromText(list.id, '2 Arroz\n1 Leite');

    await updateItemDetails(leite, {
      name: 'Arroz',
      quantity: 3,
      unit: 'un',
      categoryId: 'mercearia',
    });

    const allItems = await db.items.where('listId').equals(list.id).toArray();
    expect(allItems).toHaveLength(1);
    expect(allItems[0].id).toBe(leite.id);
    expect(allItems[0].quantity).toBe(5);

    const muts = await db.pendingSync.where('listId').equals(list.id).toArray();
    expect(muts.some((m) => m.action === 'delete_item' && m.entityId === arroz.id)).toBe(true);
    expect(muts.some((m) => m.action === 'upsert_item' && m.entityId === leite.id)).toBe(true);
  });

  it('sanitizes invalid quantity or empty unit in setItemExactQuantityAndUnit', async () => {
    const list = await createList('Validação', 'mercado');
    const [item] = await addItemsFromText(list.id, '2 L Leite');

    await setItemExactQuantityAndUnit(item, -5, '   ');
    const updated = await db.items.get(item.id);
    expect(updated?.quantity).toBe(2);
    expect(updated?.unit).toBe('L');

    await setItemExactQuantityAndUnit(item, 1.5, 'kg');
    const valid = await db.items.get(item.id);
    expect(valid?.quantity).toBe(1.5);
    expect(valid?.unit).toBe('kg');
  });
});
