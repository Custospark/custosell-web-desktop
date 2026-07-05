import { useEffect, useState } from 'react';
import { Mail, WifiOff } from 'lucide-react';
import { Modal } from '../modals/Modal';
import { Button } from '../buttons/Button';
import { Input } from '../inputs/Input';
import CustomerContactPicker, { EMPTY_CUSTOMER_CONTACT } from '../customers/CustomerContactPicker';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { useEmailInvoice, useEmailPaymentReceipt, type SendDocumentEmailResult } from '../../hooks/useDocumentEmail';
import {
  contactFromValue,
  hasResolvableContact,
  useAssignSaleCustomer,
  useResolveCustomerContact,
} from '../../hooks/useResolveCustomerContact';
import { customerToContact, type CustomerContactValue } from '../../utils/customerContactUtils';
import { emailSentLabel } from './EmailSentCountBadge';

export type DocumentEmailType = 'invoice' | 'payment_receipt';

interface SendDocumentEmailModalProps {
  open: boolean;
  onClose: () => void;
  documentType: DocumentEmailType;
  documentId: number;
  documentLabel: string;
  customerName?: string;
  defaultEmail?: string | null;
  customerId?: number | null;
  saleId?: number | null;
  emailSentCount?: number;
  onSent?: (result: SendDocumentEmailResult) => void;
  blocked?: boolean;
  blockedReason?: string;
}

const DOCUMENT_COPY: Record<DocumentEmailType, { title: string; description: string; hint: string }> = {
  invoice: {
    title: 'Email invoice',
    description: 'Send this invoice as a PDF attachment to your customer.',
    hint: 'Contact details are saved to your customer list when you send.',
  },
  payment_receipt: {
    title: 'Email payment receipt',
    description: 'Send this payment receipt as a PDF attachment to your customer.',
    hint: 'Contact details are saved to your customer list when you send.',
  },
};

export default function SendDocumentEmailModal({
  open,
  onClose,
  documentType,
  documentId,
  documentLabel,
  customerName,
  defaultEmail,
  customerId,
  saleId,
  emailSentCount = 0,
  onSent,
  blocked = false,
  blockedReason,
}: SendDocumentEmailModalProps) {
  const copy = DOCUMENT_COPY[documentType];
  const { isCompletelyOffline } = useNetworkStatus();
  const emailInvoice = useEmailInvoice();
  const emailReceipt = useEmailPaymentReceipt();
  const resolveCustomer = useResolveCustomerContact();
  const assignSaleCustomer = useAssignSaleCustomer();
  const isPending = emailInvoice.isPending || emailReceipt.isPending
    || resolveCustomer.isPending || assignSaleCustomer.isPending;

  const [contact, setContact] = useState<CustomerContactValue>(EMPTY_CUSTOMER_CONTACT);
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [toError, setToError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setContact({
      customerId: customerId ?? null,
      name: customerName?.trim() ?? '',
      email: defaultEmail?.trim() ?? '',
      phone: '',
    });
    setTo(defaultEmail?.trim() ?? '');
    setMessage('');
    setToError(undefined);
  }, [open, defaultEmail, customerName, customerId, documentId]);

  useEffect(() => {
    const email = contact.email.trim();
    if (email && !to.trim()) {
      setTo(email);
    }
  }, [contact.email, to]);

  const offline = isCompletelyOffline;
  const cannotSend = blocked || offline || documentId <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cannotSend || isPending) return;

    const trimmedTo = to.trim();
    if (!trimmedTo) {
      setToError('Enter a recipient email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedTo)) {
      setToError('Enter a valid email address');
      return;
    }

    setToError(undefined);
    const emailPayload = { to: trimmedTo, message: message.trim() || undefined };

    try {
      if (hasResolvableContact(contact, trimmedTo)) {
        const resolved = await resolveCustomer.mutateAsync({
          ...contactFromValue(contact),
          email: trimmedTo,
        });
        setContact(customerToContact(resolved));

        if (saleId && saleId > 0) {
          await assignSaleCustomer.mutateAsync({ saleId, customerId: resolved.id });
        }
      }

      const result = documentType === 'invoice'
        ? await emailInvoice.mutateAsync({ id: documentId, payload: emailPayload })
        : await emailReceipt.mutateAsync({ id: documentId, payload: emailPayload });
      onSent?.(result);
      onClose();
    } catch {
      /* toast handled in hooks */
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={copy.title} size="md">
      <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">{documentLabel}</p>
          <p className="text-xs text-blue-700/80 mt-2">{copy.description}</p>
          {emailSentCount > 0 && (
            <p className="text-xs font-medium text-violet-700 mt-2">
              {emailSentLabel(emailSentCount)}
            </p>
          )}
        </div>

        {offline && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Connect to the internet to send email.</span>
          </div>
        )}

        {blocked && blockedReason && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            {blockedReason}
          </div>
        )}

        <CustomerContactPicker
          value={contact}
          onChange={setContact}
          disabled={cannotSend || isPending}
          compact
          context="email"
        />

        <Input
          label="Send to"
          type="email"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setContact((prev) => ({ ...prev, email: e.target.value }));
            if (toError) setToError(undefined);
          }}
          placeholder="customer@example.com"
          error={toError}
          disabled={cannotSend || isPending}
          autoComplete="email"
        />
        <p className="text-[11px] text-gray-400 -mt-2">
          PDF will be delivered to this address. Customer details above are saved to your list.
        </p>

        <div className="space-y-1">
          <label htmlFor="email-message" className="block text-sm font-medium text-gray-700">
            Message <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="email-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={cannotSend || isPending}
            placeholder="Add a short note for your customer…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
          <p className="text-xs text-gray-400">{copy.hint}</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={cannotSend}>
            <Mail className="w-4 h-4 mr-1.5" />
            Send email
          </Button>
        </div>
      </form>
    </Modal>
  );
}
