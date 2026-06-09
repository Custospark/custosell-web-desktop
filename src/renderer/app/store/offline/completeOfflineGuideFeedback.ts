import { mutationQueue } from './mutationQueue';
import {
  localGuideFeedbackStore,
  type CreateGuideFeedbackPayload,
  type GuideFeedbackWithSyncMeta,
} from './localGuideFeedbackStore';
import { shouldCompleteMutationLocally } from './offlineQueryUtils';
import { GUIDE } from '../../../shared/api/endpoints/guideEndpoints';
import type { GuideFeedbackCategory } from '../../../modules/guide/api/GuideTypes';

export function shouldCompleteGuideFeedbackLocally(): boolean {
  return shouldCompleteMutationLocally();
}

export function buildLocalGuideFeedback(payload: CreateGuideFeedbackPayload): GuideFeedbackWithSyncMeta {
  const now = new Date().toISOString();
  const localIdNum = -Date.now();

  return {
    id: localIdNum,
    uuid: newLocalId(),
    category: payload.category,
    subject: payload.subject,
    body: payload.body,
    status: 'submitted',
    staff_reply: null,
    created_at: now,
    updated_at: now,
    _pendingSync: true,
  };
}

function newLocalId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function persistOfflineGuideFeedbackInBackground(
  feedback: GuideFeedbackWithSyncMeta,
  payload: CreateGuideFeedbackPayload,
): Promise<void> {
  let mutationId = '';
  try {
    mutationId = await mutationQueue.enqueue({
      method: 'POST',
      url: GUIDE.FEEDBACK,
      data: payload,
      maxRetries: 3,
    });
  } catch (err) {
    console.error('[OfflineGuideFeedback] Enqueue failed:', err);
  }

  if (!mutationId) return;

  try {
    const localId = await localGuideFeedbackStore.save(feedback, payload, mutationId);
    feedback._localId = localId;
  } catch (err) {
    console.error('[OfflineGuideFeedback] Local store save failed:', err);
  }
}

export function completeOfflineGuideFeedbackInstant(
  payload: CreateGuideFeedbackPayload,
): GuideFeedbackWithSyncMeta {
  const feedback = buildLocalGuideFeedback(payload);
  void persistOfflineGuideFeedbackInBackground(feedback, payload).catch((err) => {
    console.error('[OfflineGuideFeedback] Background persist failed:', err);
  });
  return feedback;
}
