import { useState } from 'react';
import {
  Calendar, User, Video, CheckCircle, XCircle, Loader2, AlertTriangle, X, CheckCheck, Trash2,
} from 'lucide-react';
import { useApproveBooking, useCompleteBooking, useRejectBooking, useBookingSettings, useClearBooking } from '../api/useBookingQueries';
import type { PipelineLead } from '../api/pipelineTypes';
import { fmtDate, fmtTimeRange, statusColor, ensureHttps } from './bookingHelpers';

interface LegacyBookingSectionProps {
  lead: PipelineLead;
  canEdit: boolean;
}

export default function LegacyBookingSection({ lead, canEdit }: LegacyBookingSectionProps) {
  const approveBooking = useApproveBooking();
  const completeBooking = useCompleteBooking();
  const rejectBooking = useRejectBooking();
  const clearBooking = useClearBooking();
  const { data: bookingSettings } = useBookingSettings(lead.board_id ?? 0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveLink, setApproveLink] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [copiedCheckUrl, setCopiedCheckUrl] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const status = lead.booking_status!;
  const approvedData = approveBooking.data?.data;
  const bookingToken = bookingSettings?.data?.token;
  const refCode = approvedData?.reference_code ?? lead.reference_code;
  const checkUrl = bookingToken && refCode
    ? `${window.location.origin}/book/${bookingToken}/check/${refCode}`
    : null;

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectBooking.mutate(
      { leadId: lead.id, reason: rejectReason.trim() },
      { onSuccess: () => { setShowRejectModal(false); setRejectReason(''); } },
    );
  };

  const handleApprove = () => {
    if (!approveLink.trim() && !approveNotes.trim()) return;
    approveBooking.mutate(
      {
        leadId: lead.id,
        meeting_link: approveLink.trim() || undefined,
        notes: approveNotes.trim() || undefined,
      },
      { onSuccess: () => { setShowApproveModal(false); setApproveLink(''); setApproveNotes(''); } },
    );
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Booking</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor[status] || ''}`}>{status}</span>
      </div>

      {lead.start_date && (
        <p className="mb-1 flex items-center gap-2 text-gray-700">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {fmtDate(lead.start_date)} · {fmtTimeRange(lead.start_date, lead.due_date)}
        </p>
      )}

      {lead.contact_name && (
        <p className="mb-1 flex items-center gap-2 text-gray-600"><User className="h-3.5 w-3.5 shrink-0 text-gray-400" />{lead.contact_name}</p>
      )}

      {lead.meeting_link && (
        <a href={ensureHttps(lead.meeting_link) ?? '#'} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-2 truncate font-medium text-indigo-600 hover:underline">
          <Video className="h-3.5 w-3.5 shrink-0 text-gray-400" />{lead.meeting_link}
        </a>
      )}

      {status === 'rejected' && lead.rejection_reason && (
        <p className="mb-1 flex items-start gap-2 text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{lead.rejection_reason}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {status === 'pending' && canEdit && (
          <>
            <button type="button" onClick={() => setShowApproveModal(true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </button>
            <button type="button" onClick={() => setShowRejectModal(true)} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </>
        )}
        {status === 'approved' && canEdit && (
          <button type="button" onClick={() => completeBooking.mutate(lead.id)} disabled={completeBooking.isPending} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            {completeBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark completed
          </button>
        )}
        {status === 'completed' && canEdit && (
          <button type="button" onClick={() => setShowArchiveConfirm(true)} disabled={clearBooking.isPending} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-40">
            {clearBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Archive
          </button>
        )}
      </div>

      {status === 'approved' && checkUrl && (
        <div className="mt-2 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-2.5">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle className="h-3 w-3" />
            Booking check link
          </p>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={checkUrl}
              className="min-w-0 flex-1 truncate rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-[10px] text-emerald-800"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(checkUrl);
                setCopiedCheckUrl(true);
                setTimeout(() => setCopiedCheckUrl(false), 2000);
              }}
              className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-700"
            >
              {copiedCheckUrl ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-1 text-[9px] text-emerald-600">Share this link with the visitor to check their booking status.</p>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowApproveModal(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Approve booking</h3>
              <button type="button" onClick={() => setShowApproveModal(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  <Video className="mr-1 inline-block h-3 w-3 text-gray-400" />
                  Meeting link <span className="text-gray-400 font-normal">or</span> notes <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={approveLink}
                  onChange={(e) => setApproveLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Meeting notes</label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  rows={3}
                  placeholder="Dial-in details, agenda, or anything else..."
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowApproveModal(false); setApproveLink(''); setApproveNotes(''); }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={(!approveLink.trim() && !approveNotes.trim()) || approveBooking.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approveBooking.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {approveBooking.isPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowRejectModal(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Reject booking</h3>
              <button type="button" onClick={() => setShowRejectModal(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Why are you rejecting this booking?" className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-300 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleReject} disabled={!rejectReason.trim() || rejectBooking.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {rejectBooking.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowArchiveConfirm(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Archive completed booking?</h3>
              <button type="button" onClick={() => setShowArchiveConfirm(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-gray-500">This will remove all booking data (meeting link, date, notes). The lead stays intact.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowArchiveConfirm(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={() => { setShowArchiveConfirm(false); clearBooking.mutate(lead.id); }} disabled={clearBooking.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {clearBooking.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Clear booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
