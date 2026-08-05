import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import type { PlatformPrivilegesPayload, PlatformUser, UserAccountStatus, UserNotificationIntention } from '../api/PlatformTypes';
import { PlatformUserDeleteModal } from './PlatformUserDeleteModal';
import { PlatformUserNotificationModal } from './PlatformUserNotificationModal';
import { PlatformUserPrivilegesModal } from './PlatformUserPrivilegesModal';
import { PlatformUserRoleModal } from './PlatformUserRoleModal';
import { PlatformUserStatusModal } from './PlatformUserStatusModal';

export interface PlatformUserModalState {
  statusTargets: PlatformUser[] | null;
  notifyTargets: PlatformUser[] | null;
  deleteTargets: PlatformUser[] | null;
  roleTargets: PlatformUser[] | null;
  privilegeTargets: PlatformUser[] | null;
}

export interface PlatformUserModalsProps {
  state: PlatformUserModalState;
  statusPending: boolean;
  notifyPending: boolean;
  deletePending: boolean;
  rolePending: boolean;
  privilegesPending: boolean;
  onCloseStatus: () => void;
  onCloseNotify: () => void;
  onCloseDelete: () => void;
  onCloseRole: () => void;
  onClosePrivileges: () => void;
  onConfirmStatus: (status: UserAccountStatus, reason: string, channel: NotificationChannel) => void;
  onConfirmNotify: (
    intention: UserNotificationIntention,
    message: string,
    subject: string,
    markAsNotified: boolean,
    channel: NotificationChannel,
  ) => void;
  onConfirmDelete: (reason: string) => void;
  onConfirmRole: (payload: { emails?: string[]; ids?: number[]; role: string; action: 'assign' | 'revoke' }) => void;
  onConfirmPrivileges: (payload: PlatformPrivilegesPayload) => void;
}

export function PlatformUserModals({
  state,
  statusPending,
  notifyPending,
  deletePending,
  rolePending,
  privilegesPending,
  onCloseStatus,
  onCloseNotify,
  onCloseDelete,
  onCloseRole,
  onClosePrivileges,
  onConfirmStatus,
  onConfirmNotify,
  onConfirmDelete,
  onConfirmRole,
  onConfirmPrivileges,
}: PlatformUserModalsProps) {
  const { statusTargets, notifyTargets, deleteTargets, roleTargets, privilegeTargets } = state;

  return (
    <>
      <PlatformUserStatusModal
        key={statusTargets !== null ? `status-${statusTargets.map((u) => u.id).join(',')}` : 'status-closed'}
        open={statusTargets !== null}
        users={statusTargets ?? []}
        isPending={statusPending}
        onClose={onCloseStatus}
        onConfirm={onConfirmStatus}
      />
      <PlatformUserNotificationModal
        key={notifyTargets !== null ? `notify-${notifyTargets.map((u) => u.id).join(',')}` : 'notify-closed'}
        open={notifyTargets !== null}
        users={notifyTargets ?? []}
        isPending={notifyPending}
        onClose={onCloseNotify}
        onConfirm={onConfirmNotify}
      />
      <PlatformUserDeleteModal
        key={deleteTargets !== null ? `delete-${deleteTargets.map((u) => u.id).join(',')}` : 'delete-closed'}
        open={deleteTargets !== null}
        users={deleteTargets ?? []}
        isPending={deletePending}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
      <PlatformUserRoleModal
        key={roleTargets !== null ? 'open' : 'closed'}
        open={roleTargets !== null}
        users={roleTargets ?? []}
        isPending={rolePending}
        onClose={onCloseRole}
        onConfirm={onConfirmRole}
      />
      <PlatformUserPrivilegesModal
        key={privilegeTargets !== null ? `open-${privilegeTargets[0]?.id ?? 'bulk'}` : 'closed'}
        open={privilegeTargets !== null}
        users={privilegeTargets ?? []}
        isPending={privilegesPending}
        onClose={onClosePrivileges}
        onConfirm={onConfirmPrivileges}
      />
    </>
  );
}