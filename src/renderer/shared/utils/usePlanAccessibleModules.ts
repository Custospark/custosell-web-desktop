import { useMemo } from 'react';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { getPlanAccessibleModules } from './moduleAccess';

export function usePlanAccessibleModules(): string[] {
  const user = useAppSelector((s) => s.auth.user);
  return useMemo(() => getPlanAccessibleModules(user), [user]);
}