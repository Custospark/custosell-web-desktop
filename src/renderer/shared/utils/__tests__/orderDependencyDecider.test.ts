import { describe, expect, it } from 'vitest';
import { decideDependency } from '../../../app/store/offline/sync/syncDependencyDecider';

/**
 * Regression tests for the offline "waiting for create remap" hang across every
 * entity (order, sale, category, role, shift, expense-category). A dependency on
 * a negative (temp) id must never be able to sit in the queue forever when its
 * create is no longer resolvable.
 */
describe('dependency decider (offline sync hang guard)', () => {
  const base = { entity: 'order' as const, oldId: -100, createRetryCount: 0, createMaxRetries: 3 };

  it('lets non-negative dependencies pass through', () => {
    expect(decideDependency({ ...base, oldId: 9001 })).toEqual({ action: 'wait' });
  });

  it('waits while the create is still queued in the current pass', () => {
    expect(
      decideDependency({ ...base, createStatus: 'queued' }),
    ).toEqual({ action: 'wait' });
  });

  it('re-drives a failed create while retries remain', () => {
    expect(
      decideDependency({ ...base, createStatus: 'failed', createRetryCount: 1, createId: 'create-1' }),
    ).toEqual({ action: 'requeue-create', createId: 'create-1' });
  });

  it('fails the dependent once the create exhausted retries', () => {
    expect(
      decideDependency({ ...base, createStatus: 'failed', createRetryCount: 3, createId: 'create-1' }),
    ).toEqual({ action: 'fail' });
  });

  it('remaps when the create committed and the durable map has the id', () => {
    expect(decideDependency({ ...base, serverId: 9001 })).toEqual({ action: 'remap', serverId: 9001 });
  });

  it('fails (not hangs) when the create is gone with no durable mapping', () => {
    expect(decideDependency(base)).toEqual({ action: 'fail' });
  });

  it('applies the same rules to a sale-scoped dependency', () => {
    expect(
      decideDependency({ entity: 'sale', oldId: -5, createStatus: 'queued', createRetryCount: 0, createMaxRetries: 3 }),
    ).toEqual({ action: 'wait' });
    expect(
      decideDependency({ entity: 'sale', oldId: -5, createRetryCount: 0, createMaxRetries: 3, serverId: 42 }),
    ).toEqual({ action: 'remap', serverId: 42 });
  });

  it('never loops a category/role/shift dependency past maxRetries', () => {
    for (const entity of ['category', 'role', 'shift', 'expense-category'] as const) {
      expect(
        decideDependency({ entity, oldId: -7, createStatus: 'failed', createRetryCount: 3, createMaxRetries: 3 }),
      ).toEqual({ action: 'fail' });
    }
  });
});