import { useState } from 'react';
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
      onClose={() => { /* must complete or skip */ }}
      title="What brings you to Custosell?"
      subtitle="Choose what matters most. You control modules anytime in Settings → Module access — this never changes permissions."
      size="xl"
      titleCentered
      bodyClassName="px-4 py-4 sm:px-6"
      hideCloseButton
      closeOnEscape={false}
    >
      <div className="space-y-4">
        <p className="text-center text-xs text-slate-500">
          Select one primary goal
          {primary ? ' — optionally add a second' : ''}
          .
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {INTENT_OPTIONS.map((opt) => {
            const selected = primary === opt.id || secondary === opt.id;
            const badge = primary === opt.id ? 'Primary' : secondary === opt.id ? 'Also' : null;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={cn(
                  'relative rounded-xl border px-3 py-3 text-left transition',
                  selected
                    ? 'border-indigo-400 bg-indigo-50/80 ring-1 ring-indigo-300/60'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50',
                )}
              >
                {badge ? (
                  <span className="absolute right-2 top-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                ) : null}
                <p className="pr-12 text-sm font-semibold text-slate-900">{opt.title}</p>
                <p className="mt-1 text-xs leading-snug text-slate-600">{opt.description}</p>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void handleSkip()}
            disabled={update.isPending}
            className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Skip for now
          </button>
          <Button
            onClick={() => void handleContinue()}
            disabled={!primary || update.isPending}
            loading={update.isPending}
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
