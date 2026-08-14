import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, GitBranch, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../../shared/components/modals/Modal';
import { Button } from '../../../shared/components/buttons/Button';
import { SearchableSelect } from '../../../shared/components/inputs/SearchableSelect';
import { useLocations } from '../api/settings/LocationQueries';
import { useRoles } from '../api/settings/RoleQueries';
import { useStaff } from '../api/settings/StaffQueries';
import { useTransferStaff } from '../api/settings/StaffTransferQueries';
import type { StaffWithSyncMeta } from '../../../app/store/offline/settings/localStaffStore';
import type { CreateStaffTransferData } from '../api/settings/StaffTypes';

interface StaffTransferModalProps {
  open: boolean;
  onClose: () => void;
  staff?: StaffWithSyncMeta | null;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

interface MetaRow {
  key: string;
  value: string;
}

function emptyMetaRows(): MetaRow[] {
  return [{ key: '', value: '' }];
}

export default function StaffTransferModal({ open, onClose, staff }: StaffTransferModalProps) {
  const { data: locations } = useLocations();
  const { data: roles } = useRoles();
  const { data: staffList } = useStaff();
  const transferMutation = useTransferStaff();

  const safeLocations = useMemo(() => (locations ?? []).filter(Boolean), [locations]);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const activeStaff = useMemo(() => {
    if (staff) return staff;
    if (!selectedStaffId) return null;
    return (staffList ?? []).filter(Boolean).find((s) => s.id === Number(selectedStaffId)) ?? null;
  }, [staff, selectedStaffId, staffList]);

  const fromLocationId = activeStaff?.location_id ?? activeStaff?.locations?.[0]?.id ?? null;

  const [toLocationId, setToLocationId] = useState<string>('');
  const [transferType, setTransferType] = useState<'permanent' | 'temporary'>('permanent');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [newRoleId, setNewRoleId] = useState<string>('0');
  const [metaRows, setMetaRows] = useState<MetaRow[]>(emptyMetaRows);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setSelectedStaffId(staff ? String(staff.id) : '');
      setToLocationId(fromLocationId ? String(fromLocationId) : '');
      setTransferType('permanent');
      setEffectiveAt('');
      setEndAt('');
      setReason('');
      setNotes('');
      setNewRoleId('0');
      setMetaRows(emptyMetaRows());
      setSubmitting(false);
    });
  }, [open, fromLocationId, staff]);

  const staffOptions = useMemo(
    () => (staffList ?? []).filter(Boolean).map((s) => ({ value: String(s.id), label: s.name })),
    [staffList],
  );

  const branchOptions = useMemo(
    () => safeLocations
      .filter((l) => fromLocationId == null || l.id !== fromLocationId)
      .map((l) => ({ value: String(l.id), label: l.is_default ? `${l.name} (Default)` : l.name })),
    [safeLocations, fromLocationId],
  );

  const roleOptions = useMemo(
    () => (roles ?? []).filter(Boolean).map((r) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  const toLocationIdParsed = toLocationId ? Number(toLocationId) : null;
  const canSubmit = !submitting
    && Boolean(activeStaff)
    && toLocationIdParsed != null
    && (fromLocationId == null || toLocationIdParsed !== fromLocationId)
    && (transferType === 'permanent' || endAt.trim().length > 0);

  const updateMetaRow = (index: number, patch: Partial<MetaRow>) => {
    setMetaRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = () => {
    if (!canSubmit || !activeStaff) return;
    setSubmitting(true);

    const meta: Record<string, unknown> = {};
    for (const row of metaRows) {
      const key = row.key.trim();
      if (key && row.value.trim()) {
        meta[key] = row.value.trim();
      }
    }

    const payload: CreateStaffTransferData = {
      user_id: activeStaff.id,
      from_location_id: fromLocationId ?? undefined,
      to_location_id: toLocationIdParsed as number,
      transfer_type: transferType,
      effective_at: effectiveAt.trim() || undefined,
      end_at: transferType === 'temporary' && endAt.trim() ? endAt.trim() : undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
      new_role_id: newRoleId !== '0' ? Number(newRoleId) : null,
      meta: Object.keys(meta).length > 0 ? meta : null,
    };

    transferMutation.mutate(payload, {
      onSuccess: () => onClose(),
      onError: () => setSubmitting(false),
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Transfer staff"
      subtitle={activeStaff ? `Move ${activeStaff.name} to another branch` : 'Move a staff member between branches'}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-100 p-4">
          <div className="p-2 rounded-lg bg-indigo-100">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900">Branch transfer</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              {activeStaff?.name ?? 'The selected staff member'} will be moved to the destination branch - future sales, stock, and shifts scope to it.
            </p>
          </div>
        </div>

        {!staff && (
          <div>
            <SearchableSelect
              label="Staff member *"
              placeholder="Select staff member"
              searchPlaceholder="Search staff..."
              options={staffOptions}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
              emptyOption={undefined}
              maxVisibleOptions={6}
            />
          </div>
        )}

        {activeStaff && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Staff member</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {activeStaff.name}
              </div>
            </div>
            <div>
              <label className={labelClass}>Current branch</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <GitBranch className="w-4 h-4 text-gray-400" />
                {safeLocations.find((l) => l.id === fromLocationId)?.name ?? '-'}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <SearchableSelect
              label="Destination branch *"
              placeholder="Select destination branch"
              searchPlaceholder="Search branches..."
              options={branchOptions}
              value={toLocationId}
              onChange={setToLocationId}
              emptyOption={undefined}
              maxVisibleOptions={6}
            />
          </div>
          <div>
            <label className={labelClass}>Transfer type *</label>
            <div className="flex gap-2">
              {(['permanent', 'temporary'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTransferType(type)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    transferType === type
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {type === 'permanent' ? 'Permanent' : 'Temporary'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Effective date</label>
            <input type="date" className={inputClass} value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} />
          </div>
          {transferType === 'temporary' && (
            <div>
              <label className={labelClass}>Return date *</label>
              <input type="date" className={inputClass} value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">When the staff member moves back to their original branch.</p>
            </div>
          )}
        </div>

        <div>
          <SearchableSelect
            label="New role (optional)"
            placeholder="Keep current role"
            searchPlaceholder="Search roles..."
            options={roleOptions}
            value={newRoleId}
            onChange={setNewRoleId}
            emptyOption={{ value: '0', label: 'Keep current role' }}
            maxVisibleOptions={6}
          />
        </div>

        <div>
          <label className={labelClass}>Reason</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this staff member being transferred?"
          />
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else to record about this transfer"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className={labelClass}>Custom fields (meta)</label>
            <Button variant="ghost" size="sm" onClick={() => setMetaRows((rows) => [...rows, { key: '', value: '' }])}>
              <Plus className="w-3 h-3 mr-1" /> Add field
            </Button>
          </div>
          <div className="space-y-2">
            {metaRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  value={row.key}
                  onChange={(e) => updateMetaRow(index, { key: e.target.value })}
                  placeholder="Field name (e.g. authorization_ref)"
                />
                <input
                  className={`${inputClass} flex-1`}
                  value={row.value}
                  onChange={(e) => updateMetaRow(index, { value: e.target.value })}
                  placeholder="Value"
                />
                <Button variant="ghost" size="sm" onClick={() => setMetaRows((rows) => rows.filter((_, i) => i !== index))} title="Remove field">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} loading={submitting} disabled={!canSubmit}>
            Transfer staff
          </Button>
        </div>
      </div>
    </Modal>
  );
}
