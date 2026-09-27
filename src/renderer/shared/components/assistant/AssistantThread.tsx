import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Bot, ChevronRight, GraduationCap, Mail, MessageCircle, Pencil, Phone, Play, RotateCcw, X } from 'lucide-react';
import { CUSTOSELL_SUPPORT } from '../../../modules/guide/guideSupportConfig';
import { GUIDE } from '../../api/endpoints/guideEndpoints';
import type { AssistantMessage } from '../../api/assistant/AssistantQueries';
import { AssistantLockup } from './AssistantBrand';
import { UserAvatar } from '../UserAvatar';
import { renderAssistantMessage } from './assistantMessageLinks';

interface AssistantThreadProps {
  messages: AssistantMessage[];
  prompts: string[];
  intro: string;
  greetingName?: string | null;
  /** User bubble identity - profile photo or initials; 'Guest User' renders GU. */
  senderName: string;
  senderAvatar?: string | null;
  /** Logged-in users also get the in-app tutorials link on errors. */
  showTutorials?: boolean;
  isPending: boolean;
  error: string | null;
  listRef: RefObject<HTMLDivElement | null>;
  onSend: (prompt: string) => void;
  onRetry: () => void;
  onEditMessage: (index: number) => void;
  onRegenerate: () => void;
  onDismissPrompts: () => void;
  /** False while a reply streams - actions that would fork state stay off. */
  canInteract: boolean;
}

export function AssistantThread({
  messages,
  prompts,
  intro,
  greetingName,
  senderName,
  senderAvatar,
  showTutorials,
  isPending,
  error,
  listRef,
  onSend,
  onRetry,
  onEditMessage,
  onRegenerate,
  onDismissPrompts,
  canInteract,
}: AssistantThreadProps) {
  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50 px-3 py-3">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <AssistantLockup size="lg" />
          {greetingName && (
            <p className="max-w-[30ch] text-base font-semibold text-gray-900">
              Good to have you back, {greetingName}.
            </p>
          )}
          <p className="max-w-[30ch] text-sm text-gray-500">
            {intro}
          </p>
          {prompts.length > 0 && (
            <>
              <div className="flex w-full max-w-sm items-center justify-end">
                <button
                  type="button"
                  onClick={onDismissPrompts}
                  aria-label="Dismiss suggestions"
                  title="Dismiss suggestions"
                  className="rounded p-1 text-blue-400 transition-colors hover:bg-white hover:text-blue-600"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="flex w-full max-w-sm flex-col items-stretch gap-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onSend(prompt)}
                className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 active:bg-indigo-100"
              >
                <span>{prompt}</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {messages.map((message, index) => (
            message.role === 'user' ? (
              <div key={index} className="group flex min-w-0 max-w-[85%] items-end gap-1.5 self-end">
                <div className="relative min-w-0">
                  <p
                    className="whitespace-pre-wrap break-words rounded-xl bg-blue-600 px-3 py-2 text-sm leading-relaxed text-white"
                  >
                    {message.content}
                  </p>
                  <button
                    type="button"
                    onClick={() => onEditMessage(index)}
                    disabled={!canInteract}
                    aria-label="Edit and resend message"
                    title="Edit and resend"
                    className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-gray-400 shadow ring-1 ring-gray-200 transition-colors hover:text-gray-600 focus-visible:text-gray-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                  </button>
                </div>
                <UserAvatar name={senderName} avatar={senderAvatar} size="xs" />
              </div>
            ) : (
              <div key={index} className="flex min-w-0 max-w-[90%] flex-col items-start gap-1 self-start sm:max-w-[85%]">
                <div className="flex min-w-0 items-start gap-1.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-1 ring-gray-200">
                    <Bot className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="min-w-0 whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-gray-200 [overflow-wrap:anywhere]">
                    {renderAssistantMessage(message.content)}
                  </p>
                </div>
                {index === messages.length - 1 && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    disabled={!canInteract}
                    className="ml-7 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-40"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />
                    Regenerate
                  </button>
                )}
              </div>
            )
          ))}
          {isPending && (
            <p aria-live="polite" className="self-start rounded-xl bg-white px-3 py-2 text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
              </span>
            </p>
          )}
          {error && (
            <div role="alert" className="min-w-0 self-stretch break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-xs font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                disabled={isPending}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {isPending ? 'Retrying…' : 'Retry'}
              </button>
              <div className="mt-2.5 break-words border-t border-red-200/70 pt-2.5 [overflow-wrap:anywhere]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-700">
                  Quick Support
                </p>
                <a
                  href={`mailto:${CUSTOSELL_SUPPORT.email}`}
                  className="mt-1.5 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {CUSTOSELL_SUPPORT.email}
                </a>
                {CUSTOSELL_SUPPORT.phones.map((phone) => (
                  <a
                    key={phone.tel}
                    href={`tel:${phone.tel}`}
                    className="mt-1.5 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {phone.display}
                  </a>
                ))}
                <a
                  href={CUSTOSELL_SUPPORT.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {CUSTOSELL_SUPPORT.whatsapp.label}
                </a>
                <a
                  href={CUSTOSELL_SUPPORT.youtube.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"
                >
                  <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {CUSTOSELL_SUPPORT.youtube.label}
                </a>
                {showTutorials && (
                  <Link
                    to={GUIDE.TUTORIALS}
                    className="mt-1.5 flex items-center gap-2 text-xs font-medium text-blue-700 hover:underline"
                  >
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Video tutorials and tour guides in the app
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
