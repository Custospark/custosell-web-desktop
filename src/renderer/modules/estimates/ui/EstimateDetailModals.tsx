import { Button } from '../../../shared/components/buttons/Button';
import { Modal } from '../../../shared/components/modals/Modal';
import { Input } from '../../../shared/components/inputs/Input';
import { PipelineModalHero } from './estimatesShared';
import type { Estimate } from '../api/estimateTypes';
import { Mail, XCircle } from 'lucide-react';

interface EstimateDetailModalsProps {
  showReject: boolean;
  onCloseReject: () => void;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  rejecting: boolean;
  onConfirmReject: () => void;
  showEmail: boolean;
  onCloseEmail: () => void;
  emailTo: string;
  onEmailToChange: (value: string) => void;
  estimate?: Estimate | null;
  emailing: boolean;
  onSendEmail: () => void;
}

export default function EstimateDetailModals({
  showReject,
  onCloseReject,
  rejectReason,
  onRejectReasonChange,
  rejecting,
  onConfirmReject,
  showEmail,
  onCloseEmail,
  emailTo,
  onEmailToChange,
  estimate,
  emailing,
  onSendEmail,
}: EstimateDetailModalsProps) {
  return (
    <>
      <Modal isOpen={showReject} onClose={onCloseReject} title="Decline proposal">
        <div className="space-y-5">
          <PipelineModalHero
            icon={XCircle}
            title="Decline this proposal"
            description="Provide a reason so the customer understands why the proposal was declined."
            tone="red"
          />
          <Input
            label="Reason for declining"
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Budget too high, scope changed, etc."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCloseReject}>Cancel</Button>
            <Button
              variant="danger"
              loading={rejecting}
              disabled={!rejectReason.trim()}
              onClick={onConfirmReject}
            >
              <XCircle className="h-4 w-4" />
              Decline proposal
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEmail} onClose={onCloseEmail} title="Email estimate">
        <div className="space-y-5">
          <PipelineModalHero
            icon={Mail}
            title="Send by email"
            description="Share this estimate with the customer as a professional email attachment."
            tone="blue"
          />
          <Input
            label="Recipient email"
            type="email"
            value={emailTo}
            onChange={(e) => onEmailToChange(e.target.value)}
            placeholder={estimate?.customer?.email ?? 'customer@example.com'}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCloseEmail}>Cancel</Button>
            <Button loading={emailing} onClick={onSendEmail} className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send email
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
