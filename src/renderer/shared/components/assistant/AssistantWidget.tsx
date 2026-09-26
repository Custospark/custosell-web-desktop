import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Mail, Phone, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { PRODUCT_NAME } from '../../brand/custosellBrand';
import { CUSTOSELL_SUPPORT } from '../../../modules/guide/guideSupportConfig';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { useAssistantChat, type AssistantMessage } from '../../api/assistant/AssistantQueries';
import custosellLogo from '../../assets/custosell-logo.png';
import oscarAvatar from '../../assets/oscar.webp';

const BUSINESS_PROMPTS = [
  'What is low on stock?',
  'How did sales do today?',
  'What invoices are outstanding?',
];

const PERSONAL_PROMPTS = [
  'What can I do in my workspace?',
  'How do I upgrade my plan?',
  'How does offline mode work?',
];

const SHOPPING_PROMPTS = [
  'How do I place an order?',
  'How do I track my order?',
  'How do I pay?',
];

const GUEST_PROMPTS = [
  'What can Custosell do?',
  'How do I get started?',
  'What does it cost?',
];

type AssistantSegment = 'business' | 'personal' | 'shopping' | 'guest';

const SEGMENT_COPY: Record<
  AssistantSegment,
  { input: string; intro: string; prompts: string[] }
> = {
  business: {
    input: 'Ask about your business…',
    intro:
      'I am Custosell Assistant, trained on your business - live stock, sales and invoices. Oscar and the team back me up when I get stuck.',
    prompts: BUSINESS_PROMPTS,
  },
  personal: {
    input: 'Ask about your workspace…',
    intro:
      'I am Custosell Assistant - ask about your tools, plans, or how things work. Oscar and the team back me up when I get stuck.',
    prompts: PERSONAL_PROMPTS,
  },
  shopping: {
    input: 'Ask about shopping…',
    intro:
      'I am Custosell Assistant - ask about placing orders, tracking, or paying. Oscar and the team back me up when I get stuck.',
    prompts: SHOPPING_PROMPTS,
  },
  guest: {
    input: 'Ask how Custosell works…',
    intro:
      'I am Custosell Assistant, built by Oscar\u2019s team. Ask how Custosell works - features, pricing, getting started.',
    prompts: GUEST_PROMPTS,
  },
};

/** Brand mark with Oscar's photo peeking behind - the assistant, backed by a human team. */
function AssistantLockup({ size }: { size: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-9 w-9';
  const logo = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6';
  const photo = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${box}`} aria-hidden>
      <img
        src={oscarAvatar}
        alt=""
        className={`absolute left-0 top-0 ${photo} rounded-full object-cover ring-2 ring-white`}
      />
      <span className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-white">
        <img src={custosellLogo} alt="" aria-hidden className={`${logo} rounded-full object-cover`} />
      </span>
    </span>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-indigo-500/25 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-indigo-100 ring-1 ring-inset ring-indigo-300/40">
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      AI
    </span>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const accountType = useAppSelector((s) => s.auth.user?.account_type);
  const hasBusiness = useAppSelector((s) => s.auth.user?.business_id != null);
  const chat = useAssistantChat();
  const listRef = useRef<HTMLDivElement>(null);
  const segment: AssistantSegment = !isAuthenticated
    ? 'guest'
    : accountType === 'storefront_buyer'
      ? 'shopping'
      : accountType === 'personal' || !hasBusiness
        ? 'personal'
        : 'business';
  const copy = SEGMENT_COPY[segment];
  const prompts = copy.prompts;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

  function send(content: string): boolean {
    const text = content.trim();
    if (!text || chat.isPending) return false;
    const next: AssistantMessage[] = [...messages, { role: 'user', content: text }].slice(-20);
    setMessages(next);
    setDraft('');
    setError(null);
    chat.mutate(next, {
      onSuccess: (reply) => setMessages((prev) => [...prev, { role: 'assistant', content: reply }].slice(-20)),
      onError: (err) => setError(err.message),
    });
    return true;
  }

  function resendLast() {
    if (chat.isPending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setError(null);
    chat.mutate(messages, {
      onSuccess: (reply) => setMessages((prev) => [...prev, { role: 'assistant', content: reply }].slice(-20)),
      onError: (err) => setError(err.message),
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (send(draft)) {
      requestAnimationFrame(() => {
        if (composerRef.current) composerRef.current.style.height = 'auto';
      });
    }
  }

  function growComposer(target: HTMLTextAreaElement) {
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
  }

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Chat with Custosell Assistant'}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-all active:scale-95 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700">
            <X className="h-5 w-5" aria-hidden />
          </span>
        ) : (
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700">
            <Bot className="h-6 w-6" aria-hidden />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full ring-2 ring-white">
              <img src={oscarAvatar} alt="" aria-hidden className="h-full w-full object-cover" />
            </span>
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Chat with Custosell Assistant"
          className="fixed right-0 top-0 z-40 flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl sm:w-[420px] sm:border-l sm:border-gray-200"
        >
          <header className="flex shrink-0 items-center gap-2.5 border-b border-gray-200 bg-slate-900 px-4 py-3 text-white">
            <AssistantLockup size="md" />
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold">
                Custosell Assistant
                <AiBadge />
              </h2>
              <p className="truncate text-[11px] text-slate-300">
                {isAuthenticated ? `AI assistant for ${PRODUCT_NAME}` : 'AI product guide'} · replies instantly
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-md p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <AssistantLockup size="lg" />
                <p className="max-w-[30ch] text-sm text-slate-500">
                  {copy.intro}
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((message, index) => (
                  message.role === 'user' ? (
                    <p
                      key={index}
                      className="max-w-[85%] self-end whitespace-pre-wrap rounded-xl bg-blue-600 px-3 py-2 text-sm leading-relaxed text-white"
                    >
                      {message.content}
                    </p>
                  ) : (
                    <div key={index} className="flex max-w-[90%] items-start gap-1.5 self-start">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-1 ring-slate-200">
                        <Bot className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <p className="whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200">
                        {message.content}
                      </p>
                    </div>
                  )
                ))}
                {chat.isPending && (
                  <p aria-live="polite" className="self-start rounded-xl bg-white px-3 py-2 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                    </span>
                  </p>
                )}
                {error && (
                  <div role="alert" className="self-stretch rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <p className="text-xs font-medium text-red-700">{error}</p>
                    <button
                      type="button"
                      onClick={resendLast}
                      disabled={chat.isPending}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {chat.isPending ? 'Retrying…' : 'Retry'}
                    </button>
                    <div className="mt-2.5 border-t border-red-200/70 pt-2.5">
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
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
            <textarea
              ref={composerRef}
              rows={2}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                growComposer(e.target);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                } else if (e.key === 'Escape') {
                  setOpen(false);
                }
              }}
              placeholder={copy.input}
              aria-label="Ask Custosell Assistant"
              maxLength={2000}
              className="max-h-32 min-h-[4.5rem] min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25"
            />
            <button
              type="submit"
              disabled={!draft.trim() || chat.isPending}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </form>
          <p className="shrink-0 border-t border-gray-100 bg-white px-3 py-1.5 text-center text-[10px] text-slate-400">
            AI assistant - verify important figures before acting on them.
          </p>
        </section>
      )}
    </>,
    document.body,
  );
}
