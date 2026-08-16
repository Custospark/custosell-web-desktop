import { useState } from 'react';
import { Link2, Link2Off, Repeat, ShieldCheck, User as UserIcon, Plus, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import { cn } from '../../../shared/utils/cn';
import {
  useLinkedAccounts,
  useInitiateLinkAccount,
  useConfirmLinkAccount,
  useSwitchAccount,
  useSetPrimary,
  useInitiateUnlinkAccount,
  useConfirmUnlinkAccount,
  type LinkedAccountSummary,
} from '../../../shared/api/account/linkedAccountQueries';

interface LinkedAccountsManagerProps {
  /** Embedded inside a modal/dropdown vs. full tab view on the Security page. */
  embedded?: boolean;
  onClose?: () => void;
}

/**
 * Lets a user link several of their own accounts, pick a default, switch
 * between them, and unlink secondary accounts. Linking and unlinking both
 * require a security code sent to the account being linked/unlinked - the
 * code confirms the account's owner approves the action.
 */
export function LinkedAccountsManager({ embedded = false, onClose }: LinkedAccountsManagerProps) {
  const user = useAppSelector((s) => s.auth.user);
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);
  const { data } = useLinkedAccounts();
  const initiateLink = useInitiateLinkAccount();
  const confirmLink = useConfirmLinkAccount();
  const switchMutation = useSwitchAccount();
  const setPrimaryMutation = useSetPrimary();
  const initiateUnlink = useInitiateUnlinkAccount();
  const confirmUnlink = useConfirmUnlinkAccount();
  const { confirm } = useConfirm();

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkStep, setLinkStep] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [code, setCode] = useState('');

  const [unlinkTarget, setUnlinkTarget] = useState<LinkedAccountSummary | null>(null);
  const [unlinkCode, setUnlinkCode] = useState('');

  const accounts = data?.accounts ?? [];

  const openAdd = () => {
    setLinkStep('credentials');
    setEmail('');
    setPassword('');
    setTargetUserId(null);
    setCode('');
    setLinkOpen(true);
  };

  const handleSendLinkCode = () => {
    if (!email.trim() || !password) return;
    initiateLink.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (result) => {
          setTargetUserId(result.target_user_id);
          setLinkStep('code');
        },
      },
    );
  };

  const handleConfirmLink = () => {
    if (targetUserId == null || !code.trim()) return;
    confirmLink.mutate(
      { target_user_id: targetUserId, code: code.trim() },
      {
        onSuccess: () => {
          setLinkOpen(false);
          setLinkStep('credentials');
          setEmail('');
          setPassword('');
          setTargetUserId(null);
          setCode('');
        },
      },
    );
  };

  const handleSwitch = (account: LinkedAccountSummary) => {
    if (account.user_id === user?.id) return;
    if (isCompletelyOffline) return;
    switchMutation.mutate(account.user_id);
  };

  const handleSetPrimary = (account: LinkedAccountSummary) => {
    if (account.relation === 'primary') return;
    setPrimaryMutation.mutate(account.user_id);
  };

  const handleUnlink = async (account: LinkedAccountSummary) => {
    if (account.relation === 'primary') return;
    const ok = await confirm({
      title: `Unlink ${account.name}?`,
      message: `A security code will be sent to ${account.email} to confirm. This does not delete the account itself.`,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      setUnlinkTarget(account);
      setUnlinkCode('');
      initiateUnlink.mutate(account.user_id, {
        onSuccess: () => setUnlinkTarget(account),
      });
    }
  };

  const handleConfirmUnlink = () => {
    if (!unlinkTarget || !unlinkCode.trim()) return;
    confirmUnlink.mutate(
      { user_id: unlinkTarget.user_id, code: unlinkCode.trim() },
      {
        onSuccess: () => setUnlinkTarget(null),
      },
    );
  };

  const currentAccount = accounts.find((a) => a.user_id === user?.id);

  return (
    <div className="space-y-4">
      <div className={cn(embedded ? 'space-y-2' : 'space-y-4')}>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-600" aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900">Linked Accounts</h3>
        </div>
        <p className="text-xs text-gray-500">
          Switch between the accounts you own without logging out. Your current account is the default; each link is confirmed with a security code sent to the account being linked.
        </p>
      </div>

      {isCompletelyOffline && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Linking and switching accounts requires an internet connection.
        </div>
      )}

      <ul className="space-y-2">
        {accounts.length === 0 && !currentAccount && (
          <li className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">
            No linked accounts yet. Add one to switch quickly.
          </li>
        )}
        {accounts.map((account) => {
          const isCurrent = account.user_id === user?.id;
          const isPrimary = account.relation === 'primary';
          const busy = switchMutation.isPending && switchMutation.variables === account.user_id;
          return (
            <li
              key={account.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5',
                isCurrent ? 'border-blue-200 bg-blue-50/60' : 'border-gray-200 bg-white',
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-700">
                {account.avatar ? (
                  <img src={account.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-4 w-4" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{account.name}</p>
                  {isPrimary && (
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Primary
                    </span>
                  )}
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      Current
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-500">{account.email}</p>
                {account.business?.name && (
                  <p className="truncate text-[11px] text-gray-400">
                    {account.business.name}
                    {account.is_business_owner ? ' (owner)' : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSwitch(account)}
                    disabled={isCompletelyOffline || busy}
                    title="Switch to this account"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Switch</span>
                  </Button>
                )}
                {!isPrimary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSetPrimary(account)}
                    disabled={isCompletelyOffline}
                    title="Make this the default account"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnlink(account)}
                  disabled={isCompletelyOffline || account.relation === 'primary'}
                  title={account.relation === 'primary' ? 'Set another account as default before removing' : 'Unlink this account'}
                  className="text-red-500 hover:bg-red-50"
                >
                  <Link2Off className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-end gap-2">
        {embedded && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            Done
          </Button>
        )}
        <Button size="sm" onClick={openAdd} disabled={isCompletelyOffline}>
          <Plus className="h-4 w-4 mr-1" /> Add account
        </Button>
      </div>

      {/* Link account: step 1 credentials, step 2 security code */}
      <Modal
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={linkStep === 'credentials' ? 'Link an account' : 'Enter security code'}
        subtitle={
          linkStep === 'credentials'
            ? 'Enter the email and password of the account you want to switch to.'
            : 'We sent a code to that account. Enter it to confirm the link.'
        }
        size="md"
      >
        {linkStep === 'credentials' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Account password"
              />
            </div>
            <p className="text-xs text-gray-500">
              Linking does not switch you to this account. After linking, use Switch to change accounts.
            </p>
            {initiateLink.isError && (
              <p className="text-xs text-red-600">
                {(initiateLink.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to link account'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="6-digit code"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                The code was sent to the account you are linking. It expires shortly.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleSendLinkCode}
                disabled={initiateLink.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {initiateLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Repeat className="h-4 w-4" aria-hidden />}
                Resend code
              </button>
            </div>
            {confirmLink.isError && (
              <p className="text-xs text-red-600">
                {(confirmLink.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'That security code is invalid or has expired.'}
              </p>
            )}
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button
            variant="ghost"
            onClick={() => (linkStep === 'credentials' ? setLinkOpen(false) : setLinkStep('credentials'))}
          >
            {linkStep === 'credentials' ? 'Cancel' : 'Back'}
          </Button>
          {linkStep === 'credentials' ? (
            <Button onClick={handleSendLinkCode} loading={initiateLink.isPending} disabled={!email.trim() || !password}>
              <Link2 className="h-4 w-4 mr-1" /> Send code
            </Button>
          ) : (
            <Button onClick={handleConfirmLink} loading={confirmLink.isPending} disabled={!code.trim()}>
              <Link2 className="h-4 w-4 mr-1" /> Confirm link
            </Button>
          )}
        </div>
      </Modal>

      {/* Unlink account: security code confirmation */}
      <Modal
        isOpen={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        title={`Unlink ${unlinkTarget?.name ?? 'account'}?`}
        subtitle="A security code was sent to that account. Enter it to confirm the unlink."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Security code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={unlinkCode}
                onChange={(e) => setUnlinkCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6-digit code"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              The code was sent to {unlinkTarget?.email}. Unlinking does not delete the account.
            </p>
          </div>
          {confirmUnlink.isError && (
            <p className="text-xs text-red-600">
              {(confirmUnlink.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'That security code is invalid or has expired.'}
            </p>
          )}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="ghost" onClick={() => setUnlinkTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmUnlink} loading={confirmUnlink.isPending} disabled={!unlinkCode.trim()}>
            <Link2Off className="h-4 w-4 mr-1" /> Confirm unlink
          </Button>
        </div>
      </Modal>
    </div>
  );
}
