import { useRef } from 'react';
import { Button } from '../../../shared/components/buttons/Button';
import { cn } from '../../../shared/utils/cn';
import { pipelineInputClass } from './pipelineFormFields';
import { CONVERSATION_EMOJI_OPTIONS } from './pipelineMessageUtils';
import { Paperclip, Send, Smile, X } from 'lucide-react';

interface BoardMessageComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onPost: () => void;
  posting: boolean;
  replyingTo: { user?: { name?: string } | null } | null;
  onCancelReply: () => void;
  pendingFiles: { name: string }[];
  onRemoveFile: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onInsertEmoji: (emoji: string) => void;
  mentionCandidates: { id: number; name?: string | null }[];
  onInsertMention: (userId: number, name: string) => void;
  viewer: boolean;
}

export default function BoardMessageComposer({
  draft,
  onDraftChange,
  onPost,
  posting,
  replyingTo,
  onCancelReply,
  pendingFiles,
  onRemoveFile,
  onAddFiles,
  showEmojiPicker,
  onToggleEmojiPicker,
  onInsertEmoji,
  mentionCandidates,
  onInsertMention,
  viewer,
}: BoardMessageComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (viewer) {
    return (
      <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
        <p className="text-xs text-blue-900">
          You have viewer access — you can read board discussion but cannot post messages.
        </p>
      </div>
    );
  }

  const canPost = draft.trim().length > 0 || pendingFiles.length > 0;

  return (
    <div className="relative w-full shrink-0 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600 ring-1 ring-blue-100">
          <span className="min-w-0 truncate">
            Replying to{' '}
            <span className="font-semibold text-gray-800">{replyingTo.user?.name ?? 'message'}</span>
          </span>
          <button type="button" onClick={onCancelReply} className="shrink-0 text-blue-600 hover:text-blue-800">
            Cancel
          </button>
        </div>
      )}
      {mentionCandidates.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {mentionCandidates.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onInsertMention(member.id, member.name ?? 'User')}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50"
            >
              <span className="font-medium text-gray-900">{member.name}</span>
            </button>
          ))}
        </div>
      )}
      {showEmojiPicker && (
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-2">
          {CONVERSATION_EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onInsertEmoji(emoji)}
              className="rounded-md px-2 py-1 text-lg hover:bg-gray-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-gray-200"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button type="button" onClick={() => onRemoveFile(index)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={replyingTo ? 'Write a reply… Use @ to mention' : 'Message the board team… Use @ to mention'}
            rows={2}
            className={cn(pipelineInputClass, 'min-h-[72px] w-full resize-y text-sm')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onPost();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleEmojiPicker}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
            >
              <Smile className="h-4 w-4" />
              Emoji
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-white"
            >
              <Paperclip className="h-4 w-4" />
              Attach
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) onAddFiles(files);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          className="w-full shrink-0 sm:w-auto"
          onClick={onPost}
          disabled={!canPost || posting}
          loading={posting}
        >
          <Send className="h-4 w-4" />
          Send
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        Ctrl+Enter to send · @mention teammates · Pin key decisions from message actions
      </p>
    </div>
  );
}