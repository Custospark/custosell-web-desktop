import { useEffect, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import type { DocumentMemberRole, DocumentUserRef, DocumentVisibility, FolderVisibility } from '../api/documentTypes';
import { DocumentAccessSection } from './DocumentAccessSection';
import type { AccessVisibilityValue } from '../api/documentAccessLabels';

interface DocumentAccessModalProps {
  open: boolean;
  title: string;
  itemLabel: string;
  visibility: DocumentVisibility | FolderVisibility;
  members: DocumentUserRef[];
  allowInherit?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: {
    visibility: DocumentVisibility | FolderVisibility;
    members: DocumentUserRef[];
    member_user_ids: number[];
    member_roles: Record<number, DocumentMemberRole>;
  }) => void;
}

function toMemberPayload(members: DocumentUserRef[]) {
  const member_user_ids = members.map((member) => member.id);
  const member_roles = Object.fromEntries(
    members.map((member) => [member.id, (member.role ?? 'viewer') as DocumentMemberRole]),
  ) as Record<number, DocumentMemberRole>;
  return { member_user_ids, member_roles };
}

export function DocumentAccessModal({
  open,
  title,
  itemLabel,
  visibility: initialVisibility,
  members: initialMembers,
  allowInherit = true,
  loading = false,
  onClose,
  onSave,
}: DocumentAccessModalProps) {
  const [visibility, setVisibility] = useState<AccessVisibilityValue>(initialVisibility);
  const [members, setMembers] = useState<DocumentUserRef[]>(initialMembers);

  useEffect(() => {
    if (!open) return;
    setVisibility(initialVisibility);
    setMembers(initialMembers);
  }, [initialMembers, initialVisibility, open]);

  const handleSave = () => {
    const payload = toMemberPayload(members);
    onSave({
      visibility: visibility as DocumentVisibility | FolderVisibility,
      members,
      ...payload,
    });
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose who can access <span className="font-medium text-gray-900">{itemLabel}</span>.
        </p>
        <DocumentAccessSection
          visibility={visibility}
          onVisibilityChange={setVisibility}
          selectedMembers={members}
          onSelectedMembersChange={setMembers}
          allowInherit={allowInherit}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" loading={loading} onClick={handleSave}>Save access</Button>
        </div>
      </div>
    </Modal>
  );
}
