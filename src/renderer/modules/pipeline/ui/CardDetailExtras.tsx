import { useRef, useState } from 'react';
import type { PipelineLead } from '../api/pipelineTypes';
import { useUpdatePipelineLead, useUploadPipelineAttachment, useDeletePipelineAttachment, useCreatePipelineAttachmentLink } from '../api/usePipelineQueries';
import CardLabelsSection from './CardLabelsSection';
import CardChecklistsSection from './CardChecklistsSection';
import { PipelineFormSection, PipelineIconField, pipelineInputClass } from './pipelineFormFields';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { Calendar, Link as LinkIcon, Paperclip, Plus, Trash2, AlignLeft } from 'lucide-react';

interface CardDetailExtrasProps {
  lead: PipelineLead;
  boardId: number;
  canEdit?: boolean;
}

export default function CardDetailExtras({ lead, boardId, canEdit = true }: CardDetailExtrasProps) {
  const updateLead = useUpdatePipelineLead();
  const patchLead = (payload: Record<string, unknown>) => {
    if (!canEdit) return;
    updateLead.mutate({ id: lead.id, board_id: boardId, silent: true, ...payload });
  };
  const uploadAttachment = useUploadPipelineAttachment(lead.id, boardId);
  const deleteAttachment = useDeletePipelineAttachment(lead.id, boardId);
  const addLink = useCreatePipelineAttachmentLink(lead.id, boardId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const handleAddLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    addLink.mutate(
      { url, title: linkTitle.trim() || undefined },
      { onSuccess: () => { setShowAddLink(false); setLinkUrl(''); setLinkTitle(''); } },
    );
  };

  const isLead = (lead.card_type ?? 'lead') === 'lead';
  const linkAttachments = (lead.attachments ?? []).filter((a) => a.type === 'link');
  const fileAttachments = (lead.attachments ?? []).filter((a) => !a.type || a.type === 'file');

  return (
    <>
      <PipelineFormSection title="Description" icon={AlignLeft}>
        <textarea
          defaultValue={lead.description ?? ''}
          rows={3}
          placeholder="Add a more detailed description…"
          readOnly={!canEdit}
          disabled={!canEdit}
          className={cn(pipelineInputClass, 'resize-none pl-3', !canEdit && 'bg-gray-50 text-gray-600')}
          onBlur={(e) => {
            const v = e.target.value.trim() || null;
            if (v !== (lead.description ?? null)) {
              patchLead({ description: v });
            }
          }}
        />
      </PipelineFormSection>

      <PipelineFormSection title="Dates" icon={Calendar}>
        <div className="grid gap-4 sm:grid-cols-2">
          <PipelineIconField label="Start date" icon={Calendar}>
            <input
              type="date"
              defaultValue={lead.start_date?.slice(0, 10) ?? ''}
              readOnly={!canEdit}
              disabled={!canEdit}
              className={cn(pipelineInputClass, !canEdit && 'bg-gray-50')}
              onBlur={(e) => {
                const v = e.target.value || null;
                if (v !== (lead.start_date?.slice(0, 10) ?? null)) {
                  patchLead({ start_date: v });
                }
              }}
            />
          </PipelineIconField>
          <PipelineIconField label="Due date" icon={Calendar}>
            <input
              type="date"
              defaultValue={(lead.due_date ?? lead.expected_close_date)?.slice(0, 10) ?? ''}
              readOnly={!canEdit}
              disabled={!canEdit}
              className={cn(pipelineInputClass, !canEdit && 'bg-gray-50')}
              onBlur={(e) => {
                const v = e.target.value || null;
                const current = (lead.due_date ?? lead.expected_close_date)?.slice(0, 10) ?? null;
                if (v !== current) {
                  patchLead({ due_date: v, expected_close_date: isLead ? v : lead.expected_close_date });
                }
              }}
            />
          </PipelineIconField>
        </div>
      </PipelineFormSection>

      <CardLabelsSection lead={lead} boardId={boardId} canEdit={canEdit} onPatchLead={patchLead} />
      <CardChecklistsSection lead={lead} boardId={boardId} canEdit={canEdit} />

      <PipelineFormSection title="Attachments" icon={Paperclip}>
        {canEdit && (
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xlsx,.txt,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAttachment.mutate(file);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={uploadAttachment.isPending}
              className="inline-flex items-center gap-1"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Upload file
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddLink(!showAddLink); setLinkUrl(''); setLinkTitle(''); }}
              className="inline-flex items-center gap-1"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Add link
            </Button>
          </div>
        )}

        {canEdit && showAddLink && (
          <div className="mb-3 space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className={cn(pipelineInputClass, 'pl-3 text-sm')}
              autoFocus
            />
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Link label (optional)"
              className={cn(pipelineInputClass, 'pl-3 text-sm')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLink();
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAddLink} loading={addLink.isPending} disabled={!linkUrl.trim()}>
                <Plus className="h-3.5 w-3.5" />
                Add link
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddLink(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {linkAttachments.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Links</p>
            <ul className="space-y-1.5">
              {linkAttachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-sm">
                  <a
                    href={att.link_url ?? att.file_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 truncate font-medium text-blue-700 hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                    {att.file_name}
                  </a>
                  {canEdit && (
                  <button
                    type="button"
                    onClick={() => deleteAttachment.mutate(att.id)}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Files</p>
        <ul className="space-y-2">
          {fileAttachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
              <a
                href={att.file_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-blue-600 hover:underline"
              >
                {att.file_name}
              </a>
              {canEdit && (
              <button
                type="button"
                onClick={() => deleteAttachment.mutate(att.id)}
                className="shrink-0 rounded p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              )}
            </li>
          ))}
          {fileAttachments.length === 0 && linkAttachments.length === 0 && (
            <li className="text-xs text-gray-500">No attachments yet.</li>
          )}
        </ul>
      </PipelineFormSection>
    </>
  );
}
