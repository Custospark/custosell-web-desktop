import { useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreatePipelineLead, usePipelineSources } from '../api/usePipelineQueries';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import {
  PipelineFormSection,
  PipelineIconField,
  PipelineModalHero,
  pipelineInputClass,
  pipelineSelectClass,
} from './pipelineFormFields';
import {
  DollarSign, Mail, Phone, Tag, User, UserPlus, UserRound, Users,
} from 'lucide-react';

interface CreateLeadModalProps {
  open: boolean;
  boardId: number;
  stageId: number;
  onClose: () => void;
}

export default function CreateLeadModal({ open, boardId, stageId, onClose }: CreateLeadModalProps) {
  const createLead = useCreatePipelineLead();
  const { data: sources } = usePipelineSources();
  const { data: staff } = useStaff();

  const [title, setTitle] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const reset = () => {
    setTitle('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setEstimatedValue('');
    setSourceId('');
    setAssignedTo('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createLead.mutateAsync({
      board_id: boardId,
      stage_id: stageId,
      title: title.trim(),
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
      source_id: sourceId ? Number(sourceId) : undefined,
      assigned_to: assignedTo ? Number(assignedTo) : undefined,
    });
    handleClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="Add lead" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <PipelineModalHero
          icon={UserPlus}
          tone="emerald"
          title="New opportunity"
          description="Add a lead to this stage. Contact details help when you convert to a customer."
        />

        <PipelineFormSection title="Lead details" icon={Tag}>
          <PipelineIconField label="Lead title" icon={Tag} required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={pipelineInputClass}
              placeholder="e.g. Acme Corp — annual contract"
              required
              autoFocus
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Contact" icon={User}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Contact name" icon={User}>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={pipelineInputClass}
                placeholder="Full name"
              />
            </PipelineIconField>
            <PipelineIconField label="Phone" icon={Phone}>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={pipelineInputClass}
                placeholder="+256 …"
              />
            </PipelineIconField>
          </div>
          <PipelineIconField label="Email" icon={Mail}>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={pipelineInputClass}
              placeholder="contact@company.com"
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Deal info" icon={DollarSign}>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineIconField label="Estimated value" icon={DollarSign}>
              <input
                type="number"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className={pipelineInputClass}
                placeholder="0"
              />
            </PipelineIconField>
            <PipelineIconField label="Source" icon={Tag}>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={pipelineSelectClass}
              >
                <option value="">Select source</option>
                {(sources ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </PipelineIconField>
          </div>
          <PipelineIconField label="Assign to" icon={UserRound}>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={pipelineSelectClass}
            >
              <option value="">Unassigned</option>
              {(staff ?? []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </PipelineIconField>
        </PipelineFormSection>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={createLead.isPending} className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
