import { mutationQueue } from './mutationQueue';

/** Drop queue entry immediately after server commit (prevents ghost retries). */
export async function commitMutationQueueEntry(mutationId: string): Promise<void> {
  await mutationQueue.remove(mutationId);
}

/** Commit queue entry only if it still exists (idempotent). Returns whether it was removed. */
export async function commitMutationQueueEntryIfPresent(mutationId: string): Promise<boolean> {
  const entry = await mutationQueue.getById(mutationId);
  if (!entry) return false;
  await mutationQueue.remove(mutationId);
  return true;
}
