import { useRef, useState } from 'react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { useCreateWallPost } from '../api/useWallFameQueries';
import { pipelineInputClass, PipelineFormSection, PipelineIconField, PipelineModalHero } from './pipelineFormFields';
import { useStaff } from '../../settings/api/settings/StaffQueries';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import {
  Quote, Megaphone, Trophy, Flag, Sparkles, User, Users,
  Type, MessageSquare, X, Camera,
} from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface CreateWallPostModalProps {
  open: boolean;
  onClose: () => void;
}

const POST_TYPES = [
  { value: 'quote', label: 'Quote', icon: Quote, description: 'Share an inspiring quote' },
  { value: 'shoutout', label: 'Shout-out', icon: Megaphone, description: 'Give someone a shout-out' },
  { value: 'performer', label: 'Best Performer', icon: Trophy, description: 'Recognise a top performer' },
  { value: 'milestone', label: 'Milestone', icon: Flag, description: 'Mark a team achievement' },
] as const;

export default function CreateWallPostModal({ open, onClose }: CreateWallPostModalProps) {
  const createPost = useCreateWallPost();
  const { data: staff = [] } = useStaff();
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<string>('shoutout');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const selectedStaff = selectedStaffId ? staff.find((s) => s.id === selectedStaffId) : null;

  const handleStaffSelect = (id: number | null) => {
    setSelectedStaffId(id);
    if (id) {
      const s = staff.find((st) => st.id === id);
      if (s) setAuthorName(s.name);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() || createPost.isPending) return;
    setSubmissionError(null);
    try {
      await createPost.mutateAsync({
        type: type as 'quote' | 'shoutout' | 'performer' | 'milestone',
        title: title.trim() || undefined,
        content: content.trim(),
        author_name: authorName.trim() || undefined,
        staff_id: selectedStaffId ?? undefined,
        photo: photoFile,
      });
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create post. Please try again.';
      setSubmissionError(msg);
    }
  };

  const isSubmitting = createPost.isPending;

  const handleClose = () => {
    setType('shoutout');
    setTitle('');
    setContent('');
    setAuthorName('');
    setSelectedStaffId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={handleClose} title="" size="lg">
      <div className="space-y-5">
        <PipelineModalHero
          icon={Sparkles}
          title="Add to Wall of Fame"
          description="Celebrate wins, recognise people, and mark milestones"
          tone="emerald"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all',
              photoPreview
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-gray-300 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30',
            )}
          >
            {photoPreview ? (
              <>
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearPhoto(); }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                  <Camera className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-600">Add a photo</p>
                <p className="text-[11px] text-gray-400">JPG, PNG, WebP &middot; Max 5MB</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </button>

          <div className="flex flex-col justify-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Post Type</p>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                    type === t.value
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <t.icon className={cn('h-4 w-4', type === t.value ? 'text-emerald-500' : 'text-gray-400')} />
                  <span className="text-[11px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <PipelineFormSection title="Details" icon={Type} description="What happened and who's involved">
          <PipelineIconField label="Title" icon={Type} hint="Short headline for the post">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Record-breaking sales week"
              className={pipelineInputClass}
            />
          </PipelineIconField>

          <PipelineIconField label="Content" icon={MessageSquare} required>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'quote' ? 'Inspirational quote...'
                  : type === 'shoutout' ? 'Give a shout-out...'
                  : type === 'performer' ? 'Celebrate their achievement...'
                  : 'What milestone was reached?'
              }
              rows={3}
              className={pipelineInputClass.replace('pl-10', 'pl-10 pt-2.5')}
              required
            />
          </PipelineIconField>
        </PipelineFormSection>

        <PipelineFormSection title="Who" icon={Users} description="Celebrate a team member or someone else">
          {staff.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase tracking-wider">Select a team member</label>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                {staff.filter((s) => s.is_active).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStaffSelect(selectedStaffId === s.id ? null : s.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
                      selectedStaffId === s.id
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                    )}
                  >
                    <UserAvatar name={s.name} avatar={s.avatar} size="xs" />
                    {s.name}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">Selecting a member auto-fills their name. Click again to deselect.</p>
            </div>
          )}

          <PipelineIconField
            label="Celebrated name"
            icon={User}
            hint={selectedStaff ? 'Auto-filled from selected member' : 'Enter any name (team member or not)'}
          >
            <input
              value={authorName}
              onChange={(e) => {
                setAuthorName(e.target.value);
                if (e.target.value !== selectedStaff?.name) setSelectedStaffId(null);
              }}
              placeholder="Name of the person or team"
              className={pipelineInputClass}
            />
          </PipelineIconField>
        </PipelineFormSection>

        {submissionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submissionError}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!content.trim() || isSubmitting}
            className="inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Post to Wall
          </Button>
        </div>
      </div>
    </Modal>
  );
}
