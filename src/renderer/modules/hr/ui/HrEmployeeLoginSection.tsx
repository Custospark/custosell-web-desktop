import { useCallback, useState, type FormEvent } from 'react';
import { KeyRound, Link2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { buildStaffModulesPayload } from '../../../shared/utils/moduleAccess';
import { lookupStaffEmail } from '../../settings/api/settings/StaffQueries';
import type { StaffLookupResult } from '../../settings/api/settings/StaffTypes';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import {
  useCreateHrEmployeeAccount,
  useHrAccountOptions,
  useLinkHrEmployeeUser,
  useRemoveHrEmployeeAccount,
  useUnlinkHrEmployeeUser,
} from '../api/useHrQueries';
import type { HrEmployee } from '../api/hrTypes';
import { employeeDisplayName } from '../api/hrTypes';
import { HrSectionCard } from './HrSurface';
import { HrIconField, HrModalFooter, HrModalHero, hrSelectClass } from './hrFormFields';
import { emptyAppLoginForm, type HrAppLoginFormState } from './hrAppLoginForm';
import { HrAppLoginFields } from './HrAppLoginFields';

interface HrEmployeeLoginSectionProps {
  employee: HrEmployee;
  formEmail?: string | null;
  formPhone?: string | null;
  formFirstName?: string | null;
  formLastName?: string | null;
}

const OTHER_BUSINESS_MESSAGE =
  'This email is already used by someone on another organization. Ask them to detach there first, or use a different email.';

function lookupMessage(result: StaffLookupResult | null): string | null {
  if (!result) return null;
  switch (result.status) {
    case 'available':
      return 'Email is free — a new login will be created.';
    case 'unattached':
    case 'soft_deleted':
      return `Attach existing account${result.user?.name ? ` (${result.user.name})` : ''} — password stays theirs.`;
    case 'already_member':
      return 'This person is already on your staff list. Link them below instead.';
    case 'other_business':
      return OTHER_BUSINESS_MESSAGE;
    case 'platform_inactive':
      return 'This account is deactivated by Custosell and cannot be attached.';
    default:
      return null;
  }
}

export function HrEmployeeLoginSection({
  employee,
  formEmail,
  formPhone,
  formFirstName,
  formLastName,
}: HrEmployeeLoginSectionProps) {
  const { confirm } = useConfirm();
  const id = employee.id;
  const hasLogin = Boolean(employee.user_id);
  const [linkUserId, setLinkUserId] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginForm, setLoginForm] = useState<HrAppLoginFormState>(() => ({
    ...emptyAppLoginForm(),
    email: employee.email ?? '',
  }));
  const [lookup, setLookup] = useState<StaffLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { data: accountOptions } = useHrAccountOptions(true);
  const linkUser = useLinkHrEmployeeUser();
  const unlinkUser = useUnlinkHrEmployeeUser();
  const createAccount = useCreateHrEmployeeAccount();
  const removeAccount = useRemoveHrEmployeeAccount();
  const unlinkedUsers = accountOptions?.unlinked_users ?? [];
  const roles = accountOptions?.roles ?? [];

  const isAttachMode = lookup?.status === 'unattached' || lookup?.status === 'soft_deleted';
  const lookupBlocksSubmit =
    lookup?.status === 'already_member'
    || lookup?.status === 'other_business'
    || lookup?.status === 'platform_inactive';

  const runLookup = useCallback(async () => {
    const email = loginForm.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLookup(null);
      return;
    }
    setLookupLoading(true);
    try {
      const result = await lookupStaffEmail(email);
      setLookup(result);
      if (result.status === 'unattached' || result.status === 'soft_deleted') {
        if (result.user?.name) {
          setLoginForm((prev) => ({ ...prev, password: '', password_confirmation: '' }));
        }
      }
    } catch (err) {
      setLookup(null);
      console.warn('[HR] Email lookup failed:', sanitizeErrorMessage(err, 'lookup failed'));
    } finally {
      setLookupLoading(false);
    }
  }, [loginForm.email]);

  async function handleLink() {
    if (!linkUserId) return;
    await linkUser.mutateAsync({ id, user_id: Number(linkUserId) });
    setLinkUserId('');
  }

  async function handleUnlink() {
    const ok = await confirm({
      title: 'Disconnect login?',
      message: 'Their staff account stays in Settings — only the link to this HR profile is removed.',
      confirmText: 'Disconnect',
      variant: 'warning',
    });
    if (ok) await unlinkUser.mutateAsync(id);
  }

  async function handleRemoveAccount() {
    const name = employee.user?.name ?? employeeDisplayName(employee);
    const ok = await confirm({
      title: 'Detach from organization?',
      message: `Detach ${name} from this business? Their login stays — they just lose access to this organization. Their HR profile stays.`,
      confirmText: 'Detach from organization',
      variant: 'danger',
    });
    if (ok) await removeAccount.mutateAsync(id);
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (lookupBlocksSubmit) return;
    if (!isAttachMode && loginForm.password !== loginForm.password_confirmation) return;
    if (!isAttachMode && loginForm.password.length < 6) return;
    if (!loginForm.role_id) return;

    await createAccount.mutateAsync({
      id,
      email: loginForm.email.trim(),
      ...(isAttachMode
        ? {}
        : {
            password: loginForm.password,
            password_confirmation: loginForm.password_confirmation,
          }),
      role_id: loginForm.role_id ? Number(loginForm.role_id) : null,
      modules: buildStaffModulesPayload(loginForm.modules, false, loginForm.hrFullAccess),
      phone: formPhone || null,
      account_name: `${formFirstName ?? ''} ${formLastName ?? ''}`.trim(),
    });
    setAccountOpen(false);
    setLookup(null);
    setLoginForm({ ...emptyAppLoginForm(), email: loginForm.email });
  }

  const canSubmitCreate =
    Boolean(loginForm.email.trim())
    && Boolean(loginForm.role_id)
    && !lookupBlocksSubmit
    && !lookupLoading
    && (isAttachMode
      || (loginForm.password.length >= 6 && loginForm.password === loginForm.password_confirmation));

  return (
    <>
      <HrSectionCard
        title="App login"
        description="Admin or HR owns account creation and org detach. Password is set by you — share it securely."
        actions={
          hasLogin ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleUnlink()} loading={unlinkUser.isPending}>
                Disconnect only
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => void handleRemoveAccount()}
                loading={removeAccount.isPending}
                className="inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Detach from organization
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setLoginForm({ ...emptyAppLoginForm(), email: formEmail ?? employee.email ?? '' });
                setLookup(null);
                setAccountOpen(true);
              }}
              className="inline-flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Create app login
            </Button>
          )
        }
      >
        {hasLogin && employee.user ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">{employee.user.name}</p>
            <p className="mt-0.5 text-xs opacity-80">{employee.user.email}</p>
            <p className="mt-2 text-xs text-emerald-800/80">
              Disconnect only removes the HR link (they stay on this organization). Detach from organization clears org access — their login stays.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              No app login yet. Create one with a password, or attach an existing free account. You can also link staff already on this organization.
            </p>
            {unlinkedUsers.length > 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <HrIconField label="Link existing staff" icon={Link2}>
                    <select
                      value={linkUserId}
                      onChange={(e) => setLinkUserId(e.target.value)}
                      className={hrSelectClass}
                    >
                      <option value="">Select staff…</option>
                      {unlinkedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </HrIconField>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!linkUserId}
                  loading={linkUser.isPending}
                  onClick={() => void handleLink()}
                  className="inline-flex items-center gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </Button>
              </div>
            ) : (
              <p className="text-xs text-gray-400">All staff accounts are already linked to an HR profile.</p>
            )}
          </div>
        )}
      </HrSectionCard>

      <Modal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        title={isAttachMode ? 'Attach app login' : 'Create app login'}
        subtitle={isAttachMode ? 'Existing account — no new password.' : 'You set the password — same pattern as Settings → Staff.'}
        size="lg"
      >
        <form onSubmit={(e) => void handleCreateAccount(e)} className="space-y-5">
          <HrModalHero
            icon={KeyRound}
            title={isAttachMode ? 'Attach existing login' : 'Give them access'}
            description={
              isAttachMode
                ? `Attach ${employeeDisplayName(employee)} to an existing free account. Their password stays the same.`
                : `Create a login for ${employeeDisplayName(employee)}. Share the password securely — they can change it later.`
            }
            tone="indigo"
          />
          <HrAppLoginFields
            value={loginForm}
            onChange={(next) => {
              setLoginForm(next);
              if (next.email.trim().toLowerCase() !== loginForm.email.trim().toLowerCase()) {
                setLookup(null);
              }
            }}
            roles={roles}
            passwordRequired={!isAttachMode}
            onEmailBlur={() => void runLookup()}
            emailLookingUp={lookupLoading}
            emailMessage={lookupMessage(lookup)}
            description={
              isAttachMode
                ? 'This email already has a free account. Choose role and modules to attach them to this organization.'
                : undefined
            }
          />
          {!isAttachMode && loginForm.password && loginForm.password !== loginForm.password_confirmation ? (
            <p className="text-sm text-red-600">Password confirmation does not match.</p>
          ) : null}
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              loading={createAccount.isPending}
              disabled={!canSubmitCreate}
            >
              {isAttachMode ? 'Attach login' : 'Create login'}
            </Button>
          </HrModalFooter>
        </form>
      </Modal>
    </>
  );
}
