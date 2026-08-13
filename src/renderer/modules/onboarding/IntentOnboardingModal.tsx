import { useState } from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import { useAppSelector } from '../../app/store/hooks/useApp';
import { INTENT_OPTIONS, type OnboardingIntentId } from './onboardingTypes';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface IntentOnboardingModalProps {
  open: boolean;
}

export function IntentOnboardingModal({ open }: IntentOnboardingModalProps) {
  const update = useUpdateOnboarding();
  const firstName = useAppSelector((s) => s.auth.user?.name?.trim().split(/\s+/)[0]);
  const [primary, setPrimary] = useState<OnboardingIntentId | null>(null);
  const [secondary, setSecondary] = useState<OnboardingIntentId | null>(null);

  function toggle(id: OnboardingIntentId) {
    if (primary === id) {
      setPrimary(secondary);
      setSecondary(null);
      return;
    }
    if (secondary === id) {
      setSecondary(null);
      return;
    }
    if (!primary) {
      setPrimary(id);
      return;
    }
    setSecondary(id);
  }

  async function saveIntent() {
    if (primary) {
      await update.mutateAsync({
        action: 'complete_intent',
        primary_intent: primary,
        secondary_intent: secondary,
      });
    } else {
      await update.mutateAsync({ action: 'skip_intent' });
    }
  }

  async function handleTakeTour() {
    // Intent save leads to needs_tour=true, so OnboardingGate opens the tour.
    await saveIntent();
  }

  async function handleNoThanks() {
    // Single combined action: finalize intent (skip) and skip the tour so nothing
    // is forced and the modal simply closes.
    await update.mutateAsync({ action: 'dismiss_onboarding' });
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => { /* complete or skip */ }}
      size="lg"
      titleCentered
      bodyClassName="px-0 py-0"
      panelClassName="overflow-hidden"
      hideCloseButton
      closeOnEscape={false}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-5 pb-6 pt-6 text-center text-white">
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-cyan-300/20" />
        <div className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="relative mt-3 text-xl font-bold tracking-tight sm:text-2xl">
          Welcome to Custosell{firstName ? `, ${firstName}` : ''}!
        </h2>
        <p className="relative mx-auto mt-1.5 max-w-lg text-sm text-indigo-50">
          We've set up your whole workspace for you — sales, stock, people, books, all in
          one place. Nothing to configure, and it works even when your internet doesn't.
        </p>
      </div>

      <div className="flex min-h-full flex-col space-y-3 px-4 pb-2 pt-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Make it yours (optional)</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tell us what matters most and we'll put those tools front and centre.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INTENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = primary === opt.id || secondary === opt.id;
            const badge = primary === opt.id ? 'Primary' : secondary === opt.id ? 'Also' : null;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={cn(
                  'group relative flex gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all',
                  selected
                    ? 'border-indigo-400 bg-indigo-50/90 shadow-sm ring-1 ring-indigo-300/50'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm',
                )}
              >
                {badge ? (
                  <span className="absolute right-2 top-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {badge}
                  </span>
                ) : null}
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1', opt.tone)}>
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 pr-8">
                  <span className="block text-sm font-semibold text-slate-900">{opt.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-600">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="sticky bottom-0 mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-3 shadow-[0_-4px_12px_-4px_rgba(99,102,241,0.15)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Compass className="h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">See it in 60 seconds — skip the guesswork</p>
                <p className="truncate text-xs text-slate-500">
                  You'll know exactly where everything lives from day one.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleNoThanks()}
                disabled={update.isPending}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-indigo-100/70 hover:text-slate-800 disabled:opacity-50"
              >
                No thanks
              </button>
              <Button onClick={() => void handleTakeTour()} loading={update.isPending} size="sm">
                <Compass className="mr-1.5 h-4 w-4" aria-hidden />
                Take the tour
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}