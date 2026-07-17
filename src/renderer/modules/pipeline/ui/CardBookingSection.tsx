import { useState } from 'react';
import {
  Calendar, Clock, User, Video, CheckCircle, XCircle, Loader2, AlertTriangle, X, Plus, Copy, Pencil, Trash2, CheckCheck,
} from 'lucide-react';
import { useApproveBooking, useCompleteBooking, useRejectBooking, useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useBookingSettings } from '../api/useBookingQueries';
import type { PipelineLead, PipelineLeadMeeting } from '../api/pipelineTypes';

interface CardBookingSectionProps {
  lead: PipelineLead;
  boardId?: number;
  canEdit?: boolean;
  meetingsLoading?: boolean;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function CardBookingSection({ lead, boardId, canEdit = true, meetingsLoading }: CardBookingSectionProps) {
  const meetings = lead.meetings ?? [];

  return (
    <div className="space-y-3">
      {canEdit && <ScheduleButton leadId={lead.id} />}

      {meetingsLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs text-gray-400 shadow-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading meetings...
        </div>
      ) : meetings.length === 0 ? (
        <p className="text-xs text-gray-400">No meetings scheduled.</p>
      ) : (
        meetings.map((m) => (
          <MeetingItem key={m.id} meeting={m} boardId={boardId} canEdit={canEdit} />
        ))
      )}

      {lead.booking_status && (
        <LegacyBooking lead={lead} canEdit={canEdit} />
      )}
    </div>
  );
}

/* ─── Add meeting button + form ─── */
function ScheduleButton({ leadId }: { leadId: number }) {
  const [open, setOpen] = useState(false);
  const createMeeting = useCreateMeeting();
  const deleteMeeting = useDeleteMeeting();

  const [schedDate, setSchedDate] = useState('');
  const [schedLink, setSchedLink] = useState('');
  const [schedNotes, setSchedNotes] = useState('');
  const [saved, setSaved] = useState<{
    meetingId: number; date: string; link: string; notes: string; checkUrl: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
      >
        <Plus className="h-3.5 w-3.5" />
        Schedule meeting
      </button>
    );
  }

  const handleSave = () => {
    if (!schedDate || (!schedLink.trim() && !schedNotes.trim())) return;
    createMeeting.mutate(
      { leadId, start_date: schedDate.replace('T', ' ') + ':00', due_date: schedDate.replace('T', ' ') + ':00', meeting_link: schedLink.trim() || undefined, notes: schedNotes.trim() || undefined },
      {
        onSuccess: (res) => {
          const meeting = res?.data;
          setSaved({
            meetingId: meeting?.id,
            date: schedDate,
            link: schedLink.trim(),
            notes: schedNotes.trim(),
            checkUrl: res?.check_url ?? '',
          });
        },
      },
    );
  };

  const handleDelete = () => {
    if (!saved?.meetingId) return;
    deleteMeeting.mutate(saved.meetingId, {
      onSuccess: () => { setOpen(false); setSchedDate(''); setSchedLink(''); setSchedNotes(''); setSaved(null); },
    });
  };

  const handleCopyLink = async () => {
    if (!saved?.checkUrl) return;
    await navigator.clipboard.writeText(saved.checkUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (saved) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          Meeting saved
        </p>

        <div className="mb-3 rounded-lg border border-emerald-100 bg-white px-4 py-3 text-xs">
          {saved.date && (
            <p className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {fmtDate(saved.date)} · {fmtTime(saved.date)}
            </p>
          )}
          {saved.link && (
            <p className="mt-1 flex items-center gap-2 font-medium text-indigo-600">
              <Video className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {saved.link}
            </p>
          )}
          {saved.notes && (
            <p className="mt-1 flex items-start gap-2 text-gray-500">
              <span>{saved.notes}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="text" readOnly value={saved.checkUrl} className="flex-1 truncate rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700" />
          <button
            type="button"
            onClick={handleCopyLink}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
            title="Copy link"
          >
            {linkCopied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {saved.meetingId && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMeeting.isPending}
              className="shrink-0 rounded-lg bg-white px-2.5 py-2 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50"
              title="Delete meeting"
            >
              {deleteMeeting.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <button type="button" onClick={() => { setOpen(false); setSchedDate(''); setSchedLink(''); setSchedNotes(''); setSaved(null); }} className="mt-2 text-xs text-gray-500 hover:text-gray-700">Schedule another</button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-xs font-semibold text-gray-600">Schedule a meeting</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Date &amp; time</label>
        <input type="datetime-local" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className={inp} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Link <span className="text-gray-400 font-normal">or</span> notes <span className="text-red-400">*</span></label>
        <input type="url" value={schedLink} onChange={(e) => setSchedLink(e.target.value)} placeholder="https://meet.google.com/xxx" className={inp} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
        <textarea value={schedNotes} onChange={(e) => setSchedNotes(e.target.value)} rows={2} placeholder="Agenda, topics..." className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={!schedDate || (!schedLink.trim() && !schedNotes.trim()) || createMeeting.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
          {createMeeting.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Save meeting
        </button>
        <button type="button" onClick={() => { setOpen(false); setSchedDate(''); setSchedLink(''); setSchedNotes(''); }} className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200">Cancel</button>
      </div>
    </div>
  );
}

/* ─── Single meeting item ─── */
function MeetingItem({ meeting, boardId, canEdit }: { meeting: PipelineLeadMeeting; boardId?: number; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();

  const [editDate, setEditDate] = useState((meeting.start_date ?? '').slice(0, 16));
  const [editLink, setEditLink] = useState(meeting.meeting_link ?? '');
  const [editNotes, setEditNotes] = useState(meeting.notes ?? '');
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: bookingSettings } = useBookingSettings(boardId ?? 0);

  const handleCopyLink = async () => {
    const ref = meeting.reference_code;
    const token = bookingSettings?.data?.token;
    if (!ref || !token) return;
    const url = `${window.location.origin}/book/${token}/check/${ref}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editDate || (!editLink.trim() && !editNotes.trim())) return;
    updateMeeting.mutate({
      meetingId: meeting.id,
      start_date: editDate.replace('T', ' ') + ':00',
      due_date: editDate.replace('T', ' ') + ':00',
      meeting_link: editLink.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600">Edit meeting</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Date &amp; time</label>
          <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Link</label>
          <input type="url" value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://meet.google.com/xxx" className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleSaveEdit} disabled={!editDate || (!editLink.trim() && !editNotes.trim()) || updateMeeting.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
            {updateMeeting.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor[meeting.status] || 'bg-gray-100 text-gray-600'}`}>
          <Clock className="h-2.5 w-2.5" />
          {meeting.status}
        </span>
        {meeting.reference_code && (
          <span className="font-mono text-[10px] text-gray-400">{meeting.reference_code}</span>
        )}
      </div>

      {meeting.start_date && (
        <p className="flex items-center gap-2 text-gray-700">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {fmtDate(meeting.start_date)}
          <Clock className="ml-1 h-3.5 w-3.5 shrink-0 text-gray-400" />
          {fmtTime(meeting.start_date)}
        </p>
      )}

      {meeting.meeting_link && (
        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2 truncate font-medium text-indigo-600 hover:underline">
          <Video className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          {meeting.meeting_link}
        </a>
      )}

      {meeting.notes && (
        <p className="mt-1 flex items-start gap-2 text-gray-500">
          <span>{meeting.notes}</span>
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {meeting.reference_code && (
          <button type="button" onClick={handleCopyLink} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-emerald-50 hover:text-emerald-600" title="Copy share link">
            {linkCopied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
        {canEdit && meeting.status === 'scheduled' && (
          <button type="button" onClick={() => setEditing(true)} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Edit meeting">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canEdit && (meeting.status === 'scheduled' || meeting.status === 'completed' || meeting.status === 'cancelled') && (
          <button type="button" onClick={() => deleteMeeting.mutate(meeting.id)} className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete meeting">
            {deleteMeeting.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Legacy single booking on the lead itself ─── */
function LegacyBooking({ lead, canEdit }: { lead: PipelineLead; canEdit: boolean }) {
  const approveBooking = useApproveBooking();
  const completeBooking = useCompleteBooking();
  const rejectBooking = useRejectBooking();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const status = lead.booking_status!;

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectBooking.mutate(
      { leadId: lead.id, reason: rejectReason.trim() },
      { onSuccess: () => { setShowRejectModal(false); setRejectReason(''); } },
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
          {fmtDate(lead.start_date)} · {fmtTime(lead.start_date)}
        </p>
      )}

      {lead.contact_name && (
        <p className="mb-1 flex items-center gap-2 text-gray-600"><User className="h-3.5 w-3.5 shrink-0 text-gray-400" />{lead.contact_name}</p>
      )}

      {lead.meeting_link && (
        <a href={lead.meeting_link} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-2 truncate font-medium text-indigo-600 hover:underline">
          <Video className="h-3.5 w-3.5 shrink-0 text-gray-400" />{lead.meeting_link}
        </a>
      )}

      {status === 'rejected' && lead.rejection_reason && (
        <p className="mb-1 flex items-start gap-2 text-red-600"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{lead.rejection_reason}</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {status === 'pending' && canEdit && (
          <>
            <button type="button" onClick={() => approveBooking.mutate(lead.id)} disabled={approveBooking.isPending} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              {approveBooking.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
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
      </div>

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
    </div>
  );
}