import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import axiosInstance from '../../app/api/axiosConfig';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks/useApp';
import { setUser, type AuthUser } from '../../app/store/slices/authSlice';
import { accountKeys } from '../../shared/api/account/AccountQueries';
import type { OnboardingAction, OnboardingState } from './onboardingTypes';

export const onboardingKeys = {
  all: ['onboarding'] as const,
  state: () => [...onboardingKeys.all, 'state'] as const,
};

function onboardingFromUser(user: AuthUser | null | undefined): OnboardingState | null {
  return user?.onboarding ?? null;
}

function defaultOnboarding(user: AuthUser | null | undefined): OnboardingState {
  return {
    is_owner: Boolean(user?.is_business_owner),
    needs_intent: false,
    needs_tour: false,
    primary_intent: null,
    secondary_intent: null,
    intent_completed_at: null,
    intent_skipped_at: null,
    tour_step: 0,
    tour_completed_at: null,
    tour_skipped_at: null,
  };
}

/** Apply onboarding locally so tour works offline and Replay feels instant. */
export function applyOnboardingLocally(
  dispatch: Dispatch<UnknownAction>,
  qc: QueryClient,
  user: AuthUser | null | undefined,
  patch: Partial<OnboardingState>,
): OnboardingState {
  const base = onboardingFromUser(user) ?? defaultOnboarding(user);
  const next: OnboardingState = { ...base, ...patch };
  qc.setQueryData(onboardingKeys.state(), next);
  if (user) {
    const merged = { ...user, onboarding: next };
    dispatch(setUser(merged));
    qc.setQueryData(accountKeys.profile(), merged);
  }
  return next;
}

export function localStateForAction(action: OnboardingAction): Partial<OnboardingState> {
  switch (action.action) {
    case 'replay_tour':
      return {
        needs_tour: true,
        tour_step: 0,
        tour_completed_at: null,
        tour_skipped_at: null,
      };
    case 'tour_step':
      return { tour_step: action.tour_step, needs_tour: true };
    case 'complete_tour':
      return {
        needs_tour: false,
        tour_completed_at: new Date().toISOString(),
        tour_skipped_at: null,
      };
    case 'skip_tour':
      return {
        needs_tour: false,
        tour_skipped_at: new Date().toISOString(),
      };
    case 'complete_intent':
      return {
        needs_intent: false,
        primary_intent: action.primary_intent,
        secondary_intent: action.secondary_intent ?? null,
        intent_completed_at: new Date().toISOString(),
        needs_tour: true,
        tour_step: 0,
      };
    case 'skip_intent':
      return {
        needs_intent: false,
        intent_skipped_at: new Date().toISOString(),
        needs_tour: true,
        tour_step: 0,
      };
    case 'dismiss_onboarding':
      return {
        needs_intent: false,
        intent_skipped_at: new Date().toISOString(),
        needs_tour: false,
        tour_skipped_at: new Date().toISOString(),
      };
    default:
      return {};
  }
}

export function useOnboardingState(enabled = true) {
  const user = useAppSelector((s) => s.auth.user);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const embedded = onboardingFromUser(user);

  const query = useQuery({
    queryKey: onboardingKeys.state(),
    enabled: enabled && isAuthenticated,
    queryFn: async (): Promise<OnboardingState> => {
      const { data } = await axiosInstance.get('/auth/onboarding');
      return data.data as OnboardingState;
    },
    initialData: embedded ?? undefined,
    staleTime: 30_000,
    networkMode: 'offlineFirst',
  });

  return {
    ...query,
    data: query.data ?? embedded ?? null,
  };
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return useMutation({
    mutationFn: async (payload: OnboardingAction) => {
      const local = applyOnboardingLocally(dispatch, qc, user, localStateForAction(payload));

      // Sync in the background — never block tour start / offline replay
      void axiosInstance.patch('/auth/onboarding', payload).then(({ data }) => {
        const state = data.data as OnboardingState;
        qc.setQueryData(onboardingKeys.state(), state);
        if (data.user) {
          const merged = { ...(user ?? {}), ...(data.user as AuthUser), onboarding: state };
          dispatch(setUser(merged));
          qc.setQueryData(accountKeys.profile(), merged);
        }
      }).catch(() => {
        /* keep optimistic local state */
      });

      return local;
    },
    networkMode: 'always',
  });
}
