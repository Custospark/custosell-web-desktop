import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  });

  return {
    ...query,
    data: query.data ?? embedded ?? null,
  };
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();

  return useMutation({
    mutationFn: async (payload: OnboardingAction) => {
      const { data } = await axiosInstance.patch('/auth/onboarding', payload);
      return {
        state: data.data as OnboardingState,
        user: (data.user ?? null) as AuthUser | null,
      };
    },
    onSuccess: ({ state, user }) => {
      qc.setQueryData(onboardingKeys.state(), state);
      if (user) {
        const merged = { ...user, onboarding: state };
        dispatch(setUser(merged));
        qc.setQueryData(accountKeys.profile(), merged);
      }
    },
    networkMode: 'online',
  });
}
