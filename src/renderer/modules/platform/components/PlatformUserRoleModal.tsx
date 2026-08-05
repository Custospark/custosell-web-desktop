import { useMemo, useState } from 'react';
import { AtSign, Shield, UserCheck, UserX, Users } from 'lucide-react';
import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { PipelineFormSection, PipelineIconField, pipelineInputClass, pipelineSelectClass } from '../../pipeline/ui/pipelineFormFields';
import { PipelineModalHero } from '../../pipeline/ui/pipelineFormFields';
import type { PlatformUser } from '../api/PlatformTypes';
import { parseUserEmails } from '../api/platformUserValidation';
import { usePlatformRoles } from '../api/PlatformUserQueries';

export interface PlatformUserRoleModalProps {
  open: boolean;
  users: PlatformUser[];
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (payload: { emails?: string[]; ids?: number[]; role: string; action: 'assign' | 'revoke' }) => void;
}

export function PlatformUserRoleModal({
  open,
  users,
  isPending = false,
  onClose,
  onConfirm,
}: PlatformUserRoleModalProps) {
  const { data: roles = [] } = usePlatformRoles();
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState(roles.length > 0 ? roles[0].name : '');
  const [action, setAction] = useState<'assign' | 'revoke'>('assign');
  const [touched, setTouched] = useState(false);

  const parsedExtraEmails = useMemo(() => parseUserEmails(emailInput), [emailInput]);

  const hasTargets = users.length > 0 || parsedExtraEmails.length > 0;
  const canSubmit = Boolean(role) && hasTargets;

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm({
      emails: parsedExtraEmails.length > 0 ? parsedExtraEmails : undefined,
      ids: users.length > 0 ? users.map((u) => u.id) : undefined,
      role,
      action,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Platform role"
      subtitle="Assign or revoke a platform operator role"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Shield}
          tone="indigo"
          title={action === 'assign' ? 'Assign platform role' : 'Revoke platform role'}
          description="Selected table rows are included automatically. You can also add emails for users not in the current list."
        />

        {users.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <p className="text-xs font-medium text-gray-500">Selected users ({users.length})</p>
            </div>
            <div className="max-h-20 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="px-3 py-2 truncate text-sm text-gray-800">{u.name} · {u.email}</div>
              ))}
            </div>
          </div>
        )}

        <PipelineFormSection title="Targets & role" icon={Users} description="Who gets the role change, and which platform role.">
          <div>
            <PipelineIconField label="Additional emails" icon={AtSign}>
              <textarea
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onBlur={() => setTouched(true)}
                rows={3}
                disabled={isPending}
                placeholder="Paste emails separated by commas or new lines"
                className={pipelineInputClass}
              />
            </PipelineIconField>
            {parsedExtraEmails.length > 0 && (
              <p className="mt-1 pl-10 text-xs text-gray-500">{parsedExtraEmails.length} email(s) parsed</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PipelineIconField label="Platform role" icon={UserCheck} required>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isPending || roles.length === 0}
                className={pipelineSelectClass}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </PipelineIconField>
            <PipelineIconField label="Action" icon={action === 'assign' ? UserCheck : UserX} required>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as 'assign' | 'revoke')}
                disabled={isPending}
                className={pipelineSelectClass}
              >
                <option value="assign">Assign role</option>
                <option value="revoke">Revoke role</option>
              </select>
            </PipelineIconField>
          </div>

          {touched && !hasTargets && (
            <p className="text-xs text-red-600" role="alert">Select users or enter at least one email.</p>
          )}
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            {isPending ? 'Saving...' : action === 'assign' ? 'Assign role' : 'Revoke role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}