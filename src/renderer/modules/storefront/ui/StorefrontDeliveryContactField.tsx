import { useState } from 'react';
import { ChevronRight, MapPin, MessageSquare, Phone, User } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { PhoneNumberField } from '../../../shared/components/inputs/PhoneNumberField';
import { cn } from '../../../shared/utils/cn';
import type { CountryCode } from '../../../shared/utils/countryCodes';
import {
  buildInternationalPhone,
  getDefaultCountryCode,
  parseInternationalPhone,
} from '../../../shared/utils/phoneNumber';

export type StorefrontDeliveryContact = {
  customer_name: string;
  customer_phone: string;
  notes: string;
};

interface StorefrontDeliveryContactFieldProps {
  value: StorefrontDeliveryContact;
  onChange: (value: StorefrontDeliveryContact) => void;
  disabled?: boolean;
  className?: string;
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof User;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm ring-1 ring-slate-200/80">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {hint ? <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Sales-style “Add customer” pattern: compact tap row → sectioned modal.
 */
export function StorefrontDeliveryContactField({
  value,
  onChange,
  disabled = false,
  className,
}: StorefrontDeliveryContactFieldProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(value.customer_name);
  const [notes, setNotes] = useState(value.notes);
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode);
  const [localPhone, setLocalPhone] = useState('');

  const hasContact = Boolean(value.customer_name.trim() && value.customer_phone.trim());
  const hasPartial = Boolean(value.customer_name.trim() || value.customer_phone.trim() || value.notes.trim());

  const openModal = () => {
    if (disabled) return;
    const parsed = parseInternationalPhone(value.customer_phone);
    setName(value.customer_name);
    setNotes(value.notes);
    setCountryCode(parsed.countryCode);
    setLocalPhone(parsed.localNumber);
    setOpen(true);
  };

  const handleDone = () => {
    const fullPhone = buildInternationalPhone(countryCode, localPhone);
    if (!name.trim() || !fullPhone) return;
    onChange({
      customer_name: name.trim(),
      customer_phone: fullPhone,
      notes: notes.trim(),
    });
    setOpen(false);
  };

  const canSave = Boolean(name.trim() && localPhone.replace(/\D/g, '').length > 0);

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/25';

  return (
    <>
      <div className={cn('space-y-1.5', className)}>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Delivery <span className="normal-case text-red-600">*</span>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={openModal}
          className={cn(
            'group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all',
            'focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:ring-offset-1',
            disabled && 'cursor-not-allowed opacity-60',
            !disabled && 'hover:border-teal-300 hover:shadow-sm',
            !hasContact && !hasPartial && 'border-amber-200 bg-amber-50/60',
            hasPartial && !hasContact && 'border-amber-300 bg-amber-50/80',
            hasContact && 'border-teal-200 bg-teal-50/50',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              hasContact ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-800',
            )}
          >
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            {hasContact ? (
              <>
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {value.customer_name.trim()}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                    {value.customer_phone.trim()}
                  </span>
                  {value.notes.trim() ? (
                    <span className="truncate text-slate-400">· {value.notes.trim()}</span>
                  ) : null}
                </span>
              </>
            ) : (
              <>
                <span className="block text-sm font-semibold text-slate-900">
                  Tap to add delivery information
                </span>
                <span className="mt-0.5 block text-[11px] text-amber-800/90">
                  Name and phone required so the shop can reach you
                </span>
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 group-hover:text-teal-800">
            {hasContact ? 'Change' : 'Add'}
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Delivery information"
        size="md"
        bodyClassName="px-5 py-4"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Who should the shop contact for this order? Your cart items stay on the previous screen.
          </p>

          <Section icon={User} title="Contact person" hint="How the shop should address you">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
              autoFocus
              className={inputCls}
            />
          </Section>

          <Section icon={Phone} title="Phone / WhatsApp" hint="Default country code is Uganda (+256)">
            <PhoneNumberField
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              value={localPhone}
              onChange={setLocalPhone}
              required
              showPreview
              label={undefined}
              inputClassName="rounded-xl border-slate-300 focus:border-teal-600 focus:ring-teal-600/25"
              buttonClassName="h-[42px] rounded-xl border-slate-300"
            />
          </Section>

          <Section icon={MessageSquare} title="Notes for the shop" hint="Optional — delivery tips, timing, extras">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call when nearby, prefer afternoon…"
              rows={2}
              className={inputCls}
            />
          </Section>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={!canSave} onClick={handleDone}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
