import { useState, type FormEvent } from 'react';
import { KeyRound, Link2 } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';
import { buildStaffModulesPayload } from '../../../shared/utils/moduleAccess';
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

  const { data: accountOptions } = useHrAccountOptions(true);
  const linkUser = useLinkHrEmployeeUser();
  const unlinkUser = useUnlinkHrEmployeeUser();
  const createAccount = useCreateHrEmployeeAccount();
  const removeAccount = useRemoveHrEmployeeAccount();
  const unlinkedUsers = accountOptions?.unlinked_users ?? [];
  const roles = accountOptions?.roles ?? [];

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
    const ok = await confirm({
      title: 'Remove app login?',
      message: `Delete the login for ${employee.user?.name ?? employeeDisplayName(employee)}? They will no longer be able to sign in. Their HR profile stays.`,
      confirmText: 'Remove login',
      variant: 'danger',
    });
    if (ok) await removeAccount.mutateAsync(id);
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
    if (loginForm.password !== loginForm.password_confirmation) return;
    await createAccount.mutateAsync({
      id,
      email: loginForm.email.trim(),
      password: loginForm.password,
      password_confirmation: loginForm.password_confirmation,
      role_id: loginForm.role_id ? Number(loginForm.role_id) : null,
      modules: buildStaffModulesPayload(loginForm.modules, false, loginForm.hrFullAccess),
      phone: formPhone || null,
      account_name: `${formFirstName ?? ''} ${formLastName ?? ''}`.trim(),
    });
    setAccountOpen(false);
    setLoginForm({ ...emptyAppLoginForm(), email: loginForm.email });
  }

  return (
    <>
      <HrSectionCard
        title="App login"
        description="Admin or HR owns account creation and removal. Password is set by you — share it securely."
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
                Remove login
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setLoginForm({ ...emptyAppLoginForm(), email: formEmail ?? employee.email ?? '' });
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
              Disconnect keeps the Settings account. Remove login deletes the account so they cannot sign in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              No app login yet. Create one with a password, or link an existing staff account that isn’t already tied to someone else.
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
        title="Create app login"
        subtitle="You set the password — same pattern as Settings → Staff."
        size="lg"
      >
        <form onSubmit={(e) => void handleCreateAccount(e)} className="space-y-5">
          <HrModalHero
            icon={KeyRound}
            title="Give them access"
            description={`Create a login for ${employeeDisplayName(employee)}. Share the password securely — they can change it later.`}
            tone="indigo"
          />
          <HrAppLoginFields value={loginForm} onChange={setLoginForm} roles={roles} />
          {loginForm.password && loginForm.password !== loginForm.password_confirmation ? (
            <p className="text-sm text-red-600">Password confirmation does not match.</p>
          ) : null}
          <HrModalFooter>
            <Button type="button" variant="outline" onClick={() => setAccountOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              loading={createAccount.isPending}
              disabled={
                !loginForm.email.trim()
                || loginForm.password.length < 6
                || loginForm.password !== loginForm.password_confirmation
              }
            >
              Create login
            </Button>
          </HrModalFooter>
        </form>
      </Modal>
    </>
  );
}
