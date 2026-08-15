import { axiosInstance } from '../../../api/axiosConfig';
import { store } from '../../store';
import { setBusiness, updateShiftContext } from '../../slices/authSlice';
import { persistAuthSnapshot } from '../auth/persistAuthSnapshot';
import { mutationQueue } from './mutationQueue';
import type { QueuedMutation } from './mutationQueue';
import { localOrdersStore } from '../sales/localOrdersStore';
import { localRefundsStore } from '../sales/localRefundsStore';
import { localShiftsStore } from '../sales/localShiftsStore';
import { localProductsStore } from '../inventory/localProductsStore';
import { localCategoriesStore } from '../inventory/localCategoriesStore';
import { localCustomersStore } from '../customers/localCustomersStore';
import { localExpensesStore } from '../expenses/localExpensesStore';
import { localExpenseCategoriesStore } from '../expenses/localExpenseCategoriesStore';
import { localRolesStore } from '../settings/localRolesStore';
import { localStaffStore } from '../settings/localStaffStore';
import { localBusinessSettingsStore } from '../settings/localBusinessSettingsStore';
import { localGuideFeedbackStore } from '../guide/localGuideFeedbackStore';
import { localQuickNotesStore } from '../notes/localQuickNotesStore';
import { buildExpenseFormData } from '../expenses/completeOfflineExpense';
import { commitMutationQueueEntry } from './syncMutationFinalize';
import { invalidateAfterItemCommitted } from './syncCacheRefresh';
import { refreshExpenseCategoriesSnapshot } from '../catalogs/expensesCatalogSnapshot';
import { businessToAuthInfo } from '../../../../modules/settings/api/settings/businessAuthSync';
import { AuthSyncPauseError, extractErrorMessage, isAuthHttpError } from './syncErrorUtils';
import {
  isBusinessSettingsMutation,
  isCategoryMutation,
  isCustomerMutation,
  isExpenseCategoryMutation,
  isExpenseFormPayload,
  isExpenseMutation,
  isGuideFeedbackMutation,
  isOrderMutation,
  isProductMutation,
  isQuickNoteMutation,
  isRefundMutation,
  isRoleMutation,
  isShiftCloseMutation,
  isShiftOpenMutation,
  isStaffMutation,
  extractShiftIdFromCloseUrl,
} from './syncMutators';
import {
  extractBusiness,
  reconcileDuplicateShiftClose,
  reconcileDuplicateStaffCreate,
} from './syncExtractors';

export async function processMutation(m: QueuedMutation): Promise<boolean> {
  const queued = await mutationQueue.getById(m.id);
  if (!queued || (queued.status !== 'queued' && queued.status !== 'failed')) {
    return true;
  }

  try {
    await mutationQueue.markSyncing(m.id);

    const config: {
      method: QueuedMutation['method'];
      url: string;
      data?: unknown;
      headers?: Record<string, string>;
    } = {
      method: m.method,
      url: m.url,
      data: m.data,
      headers: m.headers,
    };

    if (isExpenseMutation(m) && m.method === 'POST' && isExpenseFormPayload(m.data)) {
      config.data = buildExpenseFormData(m.data, m.url === '/expenses' ? undefined : { methodOverride: 'PUT' });
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }

    const response = await axiosInstance({ ...config, skipAuthRedirect: true } as never);

    await commitMutationQueueEntry(m.id);

    if (isRefundMutation(m)) {
      await localRefundsStore.removeByMutationId(m.id);
    }

    if (isShiftCloseMutation(m)) {
      await localShiftsStore.removeByMutationId(m.id);
      const closedShiftId = extractShiftIdFromCloseUrl(m.url);
      if (closedShiftId) {
        store.dispatch(updateShiftContext({ shift_id: null, shift_clock_in: null }));
        void persistAuthSnapshot().catch(() => undefined);
      }
    }

    if (isProductMutation(m)) {
      await localProductsStore.removeByMutationId(m.id);
    }

    if (isCategoryMutation(m)) {
      await localCategoriesStore.removeByMutationId(m.id);
    }

    if (isCustomerMutation(m)) {
      await localCustomersStore.removeByMutationId(m.id);
    }

    if (isExpenseMutation(m)) {
      await localExpensesStore.removeByMutationId(m.id);
    }

    if (isExpenseCategoryMutation(m)) {
      await localExpenseCategoriesStore.removeByMutationId(m.id);
      void refreshExpenseCategoriesSnapshot().catch(() => undefined);
    }

    if (isRoleMutation(m)) {
      await localRolesStore.removeByMutationId(m.id);
    }

    if (isStaffMutation(m)) {
      await localStaffStore.removeByMutationId(m.id);
    }

    if (isBusinessSettingsMutation(m)) {
      const serverBusiness = extractBusiness(response?.data);
      if (serverBusiness) {
        store.dispatch(setBusiness(businessToAuthInfo(serverBusiness)));
      }
      await localBusinessSettingsStore.removeByMutationId(m.id);
    }

    if (isGuideFeedbackMutation(m)) {
      await localGuideFeedbackStore.removeByMutationId(m.id);
    }

    if (isQuickNoteMutation(m)) {
      await localQuickNotesStore.removeByMutationId(m.id);
    }

    if (isOrderMutation(m)) {
      await localOrdersStore.removeByMutationId(m.id);
    }

    void invalidateAfterItemCommitted().catch(() => undefined);
    return true;
  } catch (error: unknown) {
    if (isAuthHttpError(error)) {
      throw new AuthSyncPauseError(extractErrorMessage(error, 'Authentication failed'));
    }

    const err = error as {
      response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } };
      message?: string;
    };
    const isServerError = err?.response?.status && err.response.status >= 400 && err.response.status < 500;
    const validationMessage = err?.response?.data?.errors
      ? Object.values(err.response.data.errors).flat().join(' ')
      : undefined;
    const message = validationMessage || err?.response?.data?.message || err?.message || 'Request failed';

    if (await reconcileDuplicateStaffCreate(m, message)) {
      return true;
    }

    if (await reconcileDuplicateShiftClose(m, err?.response?.status)) {
      return true;
    }

    if (isRefundMutation(m)) {
      await localRefundsStore.markFailedByMutationId(m.id);
    }
    if (isShiftCloseMutation(m)) {
      await localShiftsStore.markFailedByMutationId(m.id);
    }
    if (isShiftOpenMutation(m)) {
      await localShiftsStore.markFailedByMutationId(m.id);
    }

    if (isProductMutation(m)) {
      await localProductsStore.markFailedByMutationId(m.id, message);
    }

    if (isCategoryMutation(m)) {
      await localCategoriesStore.markFailedByMutationId(m.id);
    }

    if (isCustomerMutation(m)) {
      await localCustomersStore.markFailedByMutationId(m.id);
    }

    if (isExpenseMutation(m)) {
      await localExpensesStore.markFailedByMutationId(m.id);
    }

    if (isExpenseCategoryMutation(m)) {
      await localExpenseCategoriesStore.markFailedByMutationId(m.id);
    }

    if (isRoleMutation(m)) {
      await localRolesStore.markFailedByMutationId(m.id, message);
    }

    if (isStaffMutation(m)) {
      await localStaffStore.markFailedByMutationId(m.id, message);
    }

    if (isBusinessSettingsMutation(m)) {
      await localBusinessSettingsStore.markFailedByMutationId(m.id);
    }

    if (isGuideFeedbackMutation(m)) {
      await localGuideFeedbackStore.markFailedByMutationId(m.id, message);
    }

    if (isQuickNoteMutation(m)) {
      await localQuickNotesStore.markFailedByMutationId(m.id, message);
    }

    if (isOrderMutation(m)) {
      await localOrdersStore.markFailedByMutationId(m.id, message);
    }

    if (isServerError && m.retryCount >= m.maxRetries) {
      await mutationQueue.markFailed(m.id, message);
    } else if (isServerError) {
      await mutationQueue.markFailed(m.id, message);
    } else {
      await mutationQueue.markFailed(m.id, message);
    }
    return false;
  }
}