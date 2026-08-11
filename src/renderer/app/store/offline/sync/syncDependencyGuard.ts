import type { QueuedMutation } from './mutationQueue';
import { mutationQueue } from './mutationQueue';
import { entityIdMapper, type EntityIdKind } from './entityIdMapper';
import { decideDependency } from './syncDependencyDecider';
import {
  isCategoryCreateMutation,
  isExpenseCategoryCreateMutation,
  isOrderCreateMutation,
  isRoleCreateMutation,
  isSaleMutation,
  isShiftOpenMutation,
} from './syncMutators';
import { localOrdersStore } from '../sales/localOrdersStore';
import { localSalesStore } from '../sales/localSalesStore';
import { localCategoriesStore } from '../inventory/localCategoriesStore';
import { localRolesStore } from '../settings/localRolesStore';
import { localShiftsStore } from '../sales/localShiftsStore';
import { localExpenseCategoriesStore } from '../expenses/localExpenseCategoriesStore';
import { localProductsStore } from '../inventory/localProductsStore';
import { localStaffStore } from '../settings/localStaffStore';
import { localExpensesStore } from '../expenses/localExpensesStore';

interface TempIdRecord {
  entity: EntityIdKind;
  tempId: number;
  mutationId: string;
}

interface DependencyRef {
  entity: EntityIdKind;
  oldId: number;
  apply: (serverId: number) => Pick<QueuedMutation, 'url' | 'data'>;
}

const ORDER_SCOPED_URL = /^\/orders\/(-?\d+)(\/cancel)?$/;
const SALE_SCOPED_URL = /^\/sales\/(-?\d+)\/(payment|refund)$/;

function isCreateForEntity(entity: EntityIdKind, m: QueuedMutation): boolean {
  switch (entity) {
    case 'order':
      return isOrderCreateMutation(m);
    case 'sale':
      return isSaleMutation(m);
    case 'category':
      return isCategoryCreateMutation(m);
    case 'role':
      return isRoleCreateMutation(m);
    case 'shift':
      return isShiftOpenMutation(m);
    case 'expense-category':
      return isExpenseCategoryCreateMutation(m);
  }
}

async function loadTempIdRecords(): Promise<TempIdRecord[]> {
  const [orders, sales, categories, roles, shifts, expenseCategories] = await Promise.all([
    localOrdersStore.getPending(),
    localSalesStore.getPending(),
    localCategoriesStore.getAll(),
    localRolesStore.getAll(),
    localShiftsStore.getPending(),
    localExpenseCategoriesStore.getAll(),
  ]);

  const records: TempIdRecord[] = [];
  for (const r of orders) {
    if (Number.isInteger(r.order?.id)) records.push({ entity: 'order', tempId: r.order.id, mutationId: r.mutationId });
  }
  for (const r of sales) {
    if (Number.isInteger(r.sale?.id)) records.push({ entity: 'sale', tempId: r.sale.id, mutationId: r.mutationId });
  }
  for (const r of categories) {
    if (Number.isInteger(r.category?.id)) records.push({ entity: 'category', tempId: r.category.id, mutationId: r.mutationId });
  }
  for (const r of roles) {
    if (Number.isInteger(r.role?.id)) records.push({ entity: 'role', tempId: r.role.id, mutationId: r.mutationId });
  }
  for (const r of shifts) {
    if (Number.isInteger(r.shiftId)) records.push({ entity: 'shift', tempId: r.shiftId, mutationId: r.mutationId });
  }
  for (const r of expenseCategories) {
    if (Number.isInteger(r.category?.id)) records.push({ entity: 'expense-category', tempId: r.category.id, mutationId: r.mutationId });
  }
  return records;
}

function collectDependencyRefs(m: QueuedMutation): DependencyRef[] {
  const refs: DependencyRef[] = [];

  const orderUrl = m.url.match(ORDER_SCOPED_URL);
  if (orderUrl) {
    const oid = Number(orderUrl[1]);
    if (oid < 0) {
      const cancel = orderUrl[2] ?? '';
      refs.push({ entity: 'order', oldId: oid, apply: (id) => ({ url: `/orders/${id}${cancel}` }) });
    }
  }

  const saleUrl = m.url.match(SALE_SCOPED_URL);
  if (saleUrl) {
    const sid = Number(saleUrl[1]);
    if (sid < 0) {
      const action = saleUrl[2];
      refs.push({ entity: 'sale', oldId: sid, apply: (id) => ({ url: `/sales/${id}/${action}` }) });
    }
  }

  if (m.method === 'POST' && m.url === '/sales' && m.data) {
    const payload = m.data as { order_id?: number | null; shift_id?: number | null };
    if (typeof payload.order_id === 'number' && payload.order_id < 0) {
      refs.push({
        entity: 'order',
        oldId: payload.order_id,
        apply: (id) => ({ data: { ...payload, order_id: id } }),
      });
    }
    if (typeof payload.shift_id === 'number' && payload.shift_id < 0) {
      refs.push({
        entity: 'shift',
        oldId: payload.shift_id,
        apply: (id) => ({ data: { ...payload, shift_id: id } }),
      });
    }
  }

  if (m.method === 'POST' && m.url === '/users' && m.data) {
    const payload = m.data as { role_id?: number };
    if (typeof payload.role_id === 'number' && payload.role_id < 0) {
      refs.push({
        entity: 'role',
        oldId: payload.role_id,
        apply: (id) => ({ data: { ...payload, role_id: id } }),
      });
    }
  }

  if (m.method === 'POST' && m.url === '/products' && m.data) {
    const payload = m.data as { category_id?: number | null };
    if (typeof payload.category_id === 'number' && payload.category_id < 0) {
      refs.push({
        entity: 'category',
        oldId: payload.category_id,
        apply: (id) => ({ data: { ...payload, category_id: id } }),
      });
    }
  }

  if (m.method === 'POST' && m.url === '/expenses' && m.data) {
    const fields = (m.data as { fields?: Record<string, unknown> }).fields;
    if (fields) {
      const shiftId = fields.shift_id != null ? Number(fields.shift_id) : null;
      if (Number.isInteger(shiftId) && shiftId! < 0) {
        refs.push({
          entity: 'shift',
          oldId: shiftId!,
          apply: (id) => ({ data: { ...m.data, fields: { ...fields, shift_id: String(id) } } }),
        });
      }
      const catId = fields.expense_category_id != null ? Number(fields.expense_category_id) : null;
      if (Number.isInteger(catId) && catId! < 0) {
        refs.push({
          entity: 'expense-category',
          oldId: catId!,
          apply: (id) => ({ data: { ...m.data, fields: { ...fields, expense_category_id: String(id) } } }),
        });
      }
    }
  }

  return refs;
}

async function markDependentFailed(m: QueuedMutation, message: string): Promise<void> {
  await mutationQueue.markFailed(m.id, message);

  if (ORDER_SCOPED_URL.test(m.url) && /^\/orders\//.test(m.url)) {
    await localOrdersStore.markFailedByMutationId(m.id, message);
  } else if (m.method === 'POST' && m.url === '/sales') {
    await localSalesStore.markFailedByMutationId(m.id, message);
  } else if (m.method === 'POST' && m.url === '/users') {
    await localStaffStore.markFailedByMutationId(m.id, message);
  } else if (m.method === 'POST' && m.url === '/products') {
    await localProductsStore.markFailedByMutationId(m.id, message);
  } else if (m.method === 'POST' && m.url === '/expenses') {
    await localExpensesStore.markFailedByMutationId(m.id, message);
  }
}

/**
 * Resolves dependencies on negative (temp) ids that survive a single sync pass.
 * Prevents any offline entity from hanging in "waiting for create remap":
 *   - create still queued this pass -> let the in-memory map handle it
 *   - create failed with retries -> re-drive the create and wait
 *   - create committed -> remap via the durable id map
 *   - otherwise -> fail the dependent with a visible error
 */
export async function guardScopedMutations(
  pending: QueuedMutation[],
  currentBusinessId: number | undefined,
): Promise<QueuedMutation[]> {
  const kept: QueuedMutation[] = [];

  const localRecords = await loadTempIdRecords();
  const recordsByKey = new Map<string, TempIdRecord[]>();
  for (const record of localRecords) {
    const key = `${record.entity}:${record.tempId}`;
    const list = recordsByKey.get(key) ?? [];
    list.push(record);
    recordsByKey.set(key, list);
  }

  const createMutations = new Map<string, QueuedMutation>();
  for (const mutation of pending) {
    for (const entity of ['order', 'sale', 'category', 'role', 'shift', 'expense-category'] as EntityIdKind[]) {
      if (isCreateForEntity(entity, mutation)) createMutations.set(`${entity}:${mutation.id}`, mutation);
    }
  }

  for (const mutation of pending) {
    const refs = collectDependencyRefs(mutation);
    if (refs.length === 0) {
      kept.push(mutation);
      continue;
    }

    let shouldFail = false;
    let failMessage = '';
    const patches: Pick<QueuedMutation, 'url' | 'data'>[] = [];
    const requeues = new Set<string>();

    for (const ref of refs) {
      const key = `${ref.entity}:${ref.oldId}`;
      const candidates = recordsByKey.get(key) ?? [];
      let createEntry: QueuedMutation | undefined;
      for (const candidate of candidates) {
        const entry = await mutationQueue.getById(candidate.mutationId);
        if (entry && isCreateForEntity(ref.entity, entry)) {
          createEntry = entry;
          break;
        }
      }

      const serverId = await entityIdMapper.resolveId(ref.entity, ref.oldId, currentBusinessId);
      const decision = decideDependency({
        entity: ref.entity,
        oldId: ref.oldId,
        createStatus: createEntry?.status,
        createRetryCount: createEntry?.retryCount ?? 0,
        createMaxRetries: createEntry?.maxRetries ?? 0,
        createId: createEntry?.id,
        serverId,
      });

      switch (decision.action) {
        case 'wait':
          break;
        case 'requeue-create':
          if (decision.createId) requeues.add(decision.createId);
          break;
        case 'remap':
          patches.push(ref.apply(decision.serverId));
          break;
        case 'fail':
          shouldFail = true;
          failMessage = createEntry
            ? 'Create exhausted retries; dependent mutation could not be remapped.'
            : `${ref.entity} create is no longer in the sync queue and its server id is unavailable.`;
          break;
      }
    }

    if (shouldFail) {
      await markDependentFailed(mutation, failMessage);
      continue;
    }

    for (const createId of requeues) {
      await mutationQueue.requeueKeepRetries(createId);
    }

    if (patches.length > 0) {
      let nextUrl = mutation.url;
      let nextData = mutation.data;
      for (const patch of patches) {
        if (patch.url) nextUrl = patch.url;
        if (patch.data) nextData = { ...(nextData as object), ...(patch.data as object) };
      }
      if (nextUrl !== mutation.url || nextData !== mutation.data) {
        await mutationQueue.updateMutation(mutation.id, { url: nextUrl, data: nextData });
        kept.push({ ...mutation, url: nextUrl, data: nextData });
        continue;
      }
    }

    kept.push(mutation);
  }

  return kept;
}