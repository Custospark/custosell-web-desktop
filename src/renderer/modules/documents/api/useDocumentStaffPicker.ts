import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store/store';
import { canAccessModule } from '../../../shared/utils/moduleAccess';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import type { DocumentUserRef } from './documentTypes';
import { useDocumentAccessibleMembers } from './useDocumentQueries';

function mapStaffToDocumentRefs(staff: { id: number; name: string; avatar?: string | null; email?: string; is_active?: boolean }[]): DocumentUserRef[] {
  return staff
    .filter((member) => member.is_active !== false)
    .map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar ?? null,
      email: member.email ?? null,
    }));
}

/** Loads business staff for document access pickers - mirrors Settings staff list when available. */
export function useDocumentStaffPicker(enabled = true) {
  const user = useSelector((state: RootState) => state.auth.user);
  const hasSettingsAccess = canAccessModule(user, 'settings');

  const staffQuery = useStaff();
  const membersQuery = useDocumentAccessibleMembers(enabled && !hasSettingsAccess);

  const staffFromSettings = useMemo(
    () => (staffQuery.data ? mapStaffToDocumentRefs(staffQuery.data) : []),
    [staffQuery.data],
  );

  if (hasSettingsAccess) {
    return {
      data: staffFromSettings,
      isLoading: staffQuery.isLoading,
      isError: staffQuery.isError,
      error: staffQuery.error,
      refetch: staffQuery.refetch,
    };
  }

  return {
    data: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    isError: membersQuery.isError,
    error: membersQuery.error,
    refetch: membersQuery.refetch,
  };
}
