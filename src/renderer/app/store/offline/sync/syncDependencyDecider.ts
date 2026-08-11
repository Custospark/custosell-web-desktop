import type { EntityIdKind } from './entityIdMapper';

export type DependencyDecision =
  | { action: 'wait' }
  | { action: 'requeue-create'; createId: string }
  | { action: 'fail' }
  | { action: 'remap'; serverId: number };

export interface DependencyInput {
  entity: EntityIdKind;
  oldId: number;
  createStatus?: 'queued' | 'syncing' | 'failed' | 'completed';
  createRetryCount: number;
  createMaxRetries: number;
  createId?: string;
  serverId?: number;
}

/**
 * Pure decision table for a dependency on a negative (temp) id. Kept free of
 * IndexedDB so the "infinite waiting for create remap" regression is
 * unit-testable across every offline entity.
 *
 * - create queued/syncing -> wait for this pass's in-memory remap
 * - create failed with retries left -> re-drive it, wait
 * - create failed, retries exhausted -> fail the dependent with a visible error
 * - create committed (no entry) -> remap via the durable id map, or fail
 */
export function decideDependency(input: DependencyInput): DependencyDecision {
  if (!Number.isInteger(input.oldId) || input.oldId >= 0) {
    return { action: 'wait' };
  }

  if (input.createStatus === 'queued' || input.createStatus === 'syncing') {
    return { action: 'wait' };
  }

  if (input.createStatus === 'failed') {
    if (input.createRetryCount < input.createMaxRetries) {
      return input.createId ? { action: 'requeue-create', createId: input.createId } : { action: 'fail' };
    }
    return { action: 'fail' };
  }

  if (input.serverId !== undefined) {
    return { action: 'remap', serverId: input.serverId };
  }

  return { action: 'fail' };
}