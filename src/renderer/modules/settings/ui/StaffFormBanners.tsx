interface StaffFormBannersProps {
  syncFailed?: boolean;
  syncError?: string | null;
  isCurrentUser?: boolean;
  isBusinessOwner?: boolean;
  emailLocked?: boolean;
  isAttachMode?: boolean;
  lookupStatus?: string | null;
  lookupError?: string | null;
  alreadyMemberMessage: string;
  otherBusinessMessage: string;
  platformInactiveMessage: string;
}

export function StaffFormBanners({
  syncFailed,
  syncError,
  isCurrentUser,
  isBusinessOwner,
  emailLocked,
  isAttachMode,
  lookupStatus,
  lookupError,
  alreadyMemberMessage,
  otherBusinessMessage,
  platformInactiveMessage,
}: StaffFormBannersProps) {
  return (
    <>
      {syncFailed && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Sync failed</p>
          <p className="mt-1">{syncError || 'Update the staff details and save to retry sync.'}</p>
        </div>
      )}
      {isCurrentUser && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p className="font-medium">You are editing your own account</p>
          <p className="mt-1">
            {emailLocked
              ? 'Your name, phone, password, and modules can be updated here. Email and role stay locked.'
              : 'Your name, email, phone, and password can be updated here. Role changes are blocked.'}
          </p>
        </div>
      )}
      {isBusinessOwner && !isCurrentUser && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <p className="font-medium">Business owner account</p>
          <p className="mt-1">The owner email cannot be changed here, and the account cannot be detached.</p>
        </div>
      )}
      {isAttachMode && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">Existing account — will attach</p>
          <p className="mt-1">This email already has a login. They will join this organization without a new password.</p>
        </div>
      )}
      {lookupStatus === 'already_member' && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{alreadyMemberMessage}</div>
      )}
      {lookupStatus === 'other_business' && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{otherBusinessMessage}</div>
      )}
      {lookupStatus === 'platform_inactive' && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{platformInactiveMessage}</div>
      )}
      {lookupError && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{lookupError}</div>
      )}
    </>
  );
}
