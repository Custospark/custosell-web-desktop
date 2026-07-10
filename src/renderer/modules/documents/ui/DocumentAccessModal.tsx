import { useState } from 'react';
import { Shield } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import type { DocumentMemberRole, DocumentUserRef, DocumentVisibility, FolderVisibility } from '../api/documentTypes';
import { DocumentAccessSection } from './DocumentAccessSection';
import type { AccessVisibilityValue } from '../api/documentAccessLabels';
import { DocumentFormSection, DocumentModalFooter, DocumentModalHero } from './documentFormFields';

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

function DocumentAccessForm({
  itemLabel,
  initialVisibility,
  initialMembers,
  allowInherit,
  loading,
  onClose,
  onSave,
}: {
  itemLabel: string;
  initialVisibility: DocumentVisibility | FolderVisibility;
  initialMembers: DocumentUserRef[];
  allowInherit: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: DocumentAccessModalProps['onSave'];
}) {
  const [visibility, setVisibility] = useState<AccessVisibilityValue>(initialVisibility);
  const [members, setMembers] = useState<DocumentUserRef[]>(initialMembers);

  const handleSave = () => {
    const payload = toMemberPayload(members);
    onSave({
      visibility: visibility as DocumentVisibility | FolderVisibility,
      members,
      ...payload,
    });
  };

  return (
    <div className="space-y-5">
      <DocumentModalHero
        icon={Shield}
        title="Manage access"
        description={`Choose visibility and people for ${itemLabel}.`}
        tone="blue"
      />

      <DocumentFormSection title="Visibility & members" icon={Shield}>
        <DocumentAccessSection
          visibility={visibility}
          onVisibilityChange={setVisibility}
          selectedMembers={members}
          onSelectedMembersChange={setMembers}
          allowInherit={allowInherit}
        />
      </DocumentFormSection>

      <DocumentModalFooter>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" loading={loading} onClick={handleSave}>Save access</Button>
      </DocumentModalFooter>
    </div>
  );
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
  return (
    <Modal isOpen={open} onClose={onClose} title={title} subtitle={`Control who can access ${itemLabel}.`} size="lg">
      {open && (
        <DocumentAccessForm
          key={`${itemLabel}-${initialVisibility}-${initialMembers.map((member) => member.id).join(',')}`}
          itemLabel={itemLabel}
          initialVisibility={initialVisibility}
          initialMembers={initialMembers}
          allowInherit={allowInherit}
          loading={loading}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}
