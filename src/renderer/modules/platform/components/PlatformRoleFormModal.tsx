import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { Shield, Hash, Check } from 'lucide-react';
import type { PlatformRole } from '../api/PlatformTypes';
import { useCreatePlatformRole, useUpdatePlatformRole } from '../api/PlatformUserQueries';
import { PipelineModalHero, PipelineFormSection, PipelineIconField, pipelineInputClass } from '../../pipeline/ui/pipelineFormFields';

const BUILT_IN_ROLES = ['platform-admin', 'platform-analyst', 'platform-support'];

interface PlatformRoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: PlatformRole | null;
}

export function PlatformRoleFormModal({ isOpen, onClose, role }: PlatformRoleFormModalProps) {
  const isEditing = !!role;
  const createMutation = useCreatePlatformRole();
  const updateMutation = useUpdatePlatformRole();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [name, setName] = useState(role?.name ?? '');
  const isBuiltIn = role ? BUILT_IN_ROLES.includes(role.name) : false;

  const canSubmit = name.trim().length > 2 && (!isEditing || name.trim() !== role?.name);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isEditing && role) {
      updateMutation.mutate({ id: role.id, name: name.trim() }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name: name.trim() }, { onSuccess: onClose });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Platform Role' : 'Add Platform Role'}
      subtitle={isEditing ? 'Rename the role' : 'Create a new operator role'}
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <PipelineModalHero
          icon={Shield}
          tone="indigo"
          title={isEditing ? 'Update platform role' : 'New platform role'}
          description={
            isEditing
              ? `Rename "${role?.name}" to something clearer for your operators`
              : 'Create a role that groups platform operators together'
          }
        />

        <PipelineFormSection
          title="Role details"
          icon={Hash}
          description="A short name for the operator role."
        >
          <PipelineIconField label="Role name" icon={Hash} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting || isBuiltIn}
              placeholder="e.g. platform-billing"
              className={pipelineInputClass}
              required
            />
          </PipelineIconField>
          {isBuiltIn && (
            <p className="text-xs text-gray-500">Built-in role names cannot be changed.</p>
          )}
          <p className="text-xs text-gray-500">
            Access is granted by module, so roles simply group operators. Add or remove members from the roles page.
          </p>
        </PipelineFormSection>

        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-gray-100 bg-white px-4 pt-4 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
