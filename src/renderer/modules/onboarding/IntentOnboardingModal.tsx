import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../../shared/components/modals/Modal';
import { Button } from '../../shared/components/buttons/Button';
import { cn } from '../../shared/utils/cn';
import { INTENT_OPTIONS, type OnboardingIntentId } from './onboardingTypes';
import { useUpdateOnboarding } from './useOnboardingQueries';

interface IntentOnboardingModalProps {
  open: boolean;
}

export function IntentOnboardingModal({ open }: IntentOnboardingModalProps) {
  const update = useUpdateOnboarding();
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

  async function handleContinue() {
    if (!primary) return;
    await update.mutateAsync({
      action: 'complete_intent',
      primary_intent: primary,
      secondary_intent: secondary,
    });
  }

  async function handleSkip() {
    await update.mutateAsync({ action: 'skip_intent' });
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => { /* complete or skip */ }}
      size="2xl"
      titleCentered
      bodyClassName="px-0 py-0"
      panelClassName="overflow-hidden max-w-4xl"
      hideCloseButton
      closeOnEscape={false}
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-6 pb-8 pt-8 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rounded-full bg-cyan-300/20" />
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
          <Sparkles className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="relative mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          What brings you to Custosell?
        </h2>
        <p className="relative mx-auto mt-2 max-w-xl text-sm text-indigo-50 sm:text-base">
          You’re in control of a full business workspace — sales, stock, people, books, and more.
          Pick what matters most. You enable modules anytime in Settings → Module access.
        </p>
      </div>

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <p className="text-center text-sm font-medium text-slate-700">
          {primary
            ? 'Nice — add a second focus if you want, then continue'
            : 'Choose your primary goal to get started'}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                  'group relative flex gap-3 overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left transition-all',
                  selected
                    ? 'border-indigo-400 bg-indigo-50/90 shadow-md shadow-indigo-100 ring-1 ring-indigo-300/50'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm',
                )}
              >
                {badge ? (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {badge}
                  </span>
                ) : null}
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1', opt.tone)}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 pr-10">
                  <span className="block text-sm font-semibold text-slate-900">{opt.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-600">{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void handleSkip()}
            disabled={update.isPending}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Skip — take the tour anyway
          </button>
          <Button
            onClick={() => void handleContinue()}
            disabled={!primary || update.isPending}
            loading={update.isPending}
            className="min-w-[9rem]"
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
