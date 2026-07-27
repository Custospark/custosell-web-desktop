import { useState, useCallback, useEffect } from 'react';
import {
  useCampaignCodes, useCreateCampaignCode, useUpdateCampaignCode, useDeleteCampaignCode,
} from './api/PlatformCampaignQueries';
import { Button } from '../../shared/components/buttons/Button';
import { LoadingSkeleton } from '../../shared/components/loading/LoadingSkeletons';
import { Table } from '../../shared/components/tables/Table';
import PlatformCampaignCodeFormModal from './PlatformCampaignCodeFormModal';
import { formatDistanceToNow } from 'date-fns';
import QRCodeLib from 'qrcode';
import { cn } from '../../shared/utils/cn';
import { Plus, Percent, DollarSign, Gift, Trash2, Pencil, Eye, QrCode, Download, X, Share2, Copy, Check, Link } from 'lucide-react';
import type { CampaignCode } from './api/PlatformTypes';

export default function PlatformCampaignCodesPage() {
  const { data: codes, isLoading } = useCampaignCodes({ owner_type: 'campaign' });
  const createMutation = useCreateCampaignCode();
  const updateMutation = useUpdateCampaignCode();
  const deleteMutation = useDeleteCampaignCode();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignCode | null>(null);
  const [viewing, setViewing] = useState<CampaignCode | null>(null);
  const [qrCode, setQrCode] = useState<CampaignCode | null>(null);
  const [copiedLinkCode, setCopiedLinkCode] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((c: CampaignCode) => {
    setEditing(c);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback((data: Record<string, unknown>) => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data }, { onSuccess: () => closeModal() });
    } else {
      createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0], { onSuccess: () => closeModal() });
    }
  }, [editing, createMutation, updateMutation, closeModal]);

  const handleToggleActive = useCallback((c: CampaignCode) => {
    updateMutation.mutate({ id: c.id, data: { is_active: !c.is_active } });
  }, [updateMutation]);

  const handleCopyLink = useCallback(async (code: string) => {
    const url = `${window.location.origin}/register?campaign=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkCode(code);
      setTimeout(() => setCopiedLinkCode(null), 2000);
    } catch { /* ignore */ }
  }, []);

  if (isLoading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Codes</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage promotional discount codes</p>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Campaign Code
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {codes && codes.length > 0 ? (
          <Table
            columns={[
              {
                key: 'code',
                header: 'Code',
                render: (r: CampaignCode) => (
                  <span className="font-mono font-bold text-indigo-700">{r.code}</span>
                ),
              },
              {
                key: 'discount_type',
                header: 'Discount',
                render: (r: CampaignCode) => (
                  <span className="flex items-center gap-1 text-sm">
                    {r.discount_type === 'percentage' ? <Percent className="w-3.5 h-3.5 text-green-600" /> : r.discount_type === 'flat_amount' ? <DollarSign className="w-3.5 h-3.5 text-blue-600" /> : null}
                    {r.discount_type === 'percentage' ? `${r.discount_value}%` : r.discount_type === 'flat_amount' ? `$${r.discount_value}` : 'Free month'}
                  </span>
                ),
              },
              {
                key: 'usage_count',
                header: 'Used',
                render: (r: CampaignCode) => (
                  <span className="text-sm font-medium">{(r as CampaignCode & { usage_count?: number }).usage_count ?? 0}{r.max_uses ? ` / ${r.max_uses}` : ''}</span>
                ),
              },
              {
                key: 'is_active',
                header: 'Status',
                render: (r: CampaignCode) => (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_active ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                ),
              },
              {
                key: 'expires_at',
                header: 'Expires',
                render: (r: CampaignCode) => r.expires_at
                  ? <span className="text-sm text-gray-500">{formatDistanceToNow(new Date(r.expires_at), { addSuffix: true })}</span>
                  : <span className="text-sm text-gray-400">Never</span>,
              },
              {
                key: 'created_at',
                header: 'Created',
                render: (r: CampaignCode) => <span className="text-sm text-gray-500">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>,
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (r: CampaignCode) => (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQrCode(r)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer" title="QR code">
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(r.code)}
                      className={cn(
                        'p-1 transition-colors cursor-pointer',
                        copiedLinkCode === r.code ? 'text-green-600' : 'text-gray-400 hover:text-indigo-600',
                      )}
                      title="Copy link"
                    >
                      {copiedLinkCode === r.code ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => setViewing(r)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer" title="View usage">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleToggleActive(r)} className="p-1 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer" title={r.is_active ? 'Deactivate' : 'Activate'}>
                      <span className={`inline-block w-3 h-3 rounded-full border ${r.is_active ? 'border-green-500 bg-green-400' : 'border-gray-400 bg-gray-300'}`} />
                    </button>
                    <button type="button" onClick={() => { if (confirm(`Delete code "${r.code}"?`)) deleteMutation.mutate(r.id); }} className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={codes}
          />
        ) : (
          <div className="flex flex-col items-center py-12 text-center">
            <Gift className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No campaign codes yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first promotional code to offer discounts</p>
          </div>
        )}
      </div>

      <PlatformCampaignCodeFormModal
        key={editing?.id ?? 'create'}
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        title={editing ? 'Edit Campaign Code' : 'Create Campaign Code'}
        initial={editing ? {
          code: editing.code,
          discount_type: editing.discount_type,
          discount_value: String(editing.discount_value ?? ''),
          discount_duration_months: String(editing.discount_duration_months ?? 1),
          max_uses: editing.max_uses ? String(editing.max_uses) : '',
          expires_at: editing.expires_at ? editing.expires_at.slice(0, 16) : '',
          is_active: editing.is_active,
        } : null}
      />

      {qrCode && <CampaignCodeQrModal code={qrCode} onClose={() => setQrCode(null)} />}

      {viewing && (
        <UsageModal code={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function UsageModal({ code, onClose }: { code: CampaignCode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Usage: <span className="font-mono text-indigo-700">{code.code}</span></h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-lg font-bold text-blue-700">{(code as CampaignCode & { usage_count?: number }).usage_count ?? 0}</p>
            <p className="text-xs text-blue-600">Total Uses</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <p className="text-lg font-bold text-amber-700">{code.max_uses ?? '∞'}</p>
            <p className="text-xs text-amber-600">Max Uses</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 border-t border-gray-100 pt-3">
          <span>{code.is_active ? 'Active' : 'Inactive'}</span>
          {code.expires_at && <span>Expires {formatDistanceToNow(new Date(code.expires_at), { addSuffix: true })}</span>}
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Discount: {code.discount_type === 'percentage' ? `${code.discount_value}%` : code.discount_type === 'flat_amount' ? `$${code.discount_value}` : 'Free month'} for {code.discount_duration_months} month(s)</p>
          <p>Created {formatDistanceToNow(new Date(code.created_at), { addSuffix: true })}</p>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

function CampaignCodeQrModal({ code, onClose }: { code: CampaignCode; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const url = `${window.location.origin}/register?campaign=${code.code}`;

  useEffect(() => {
    QRCodeLib.toDataURL(url, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [url]);

  const download = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `custosell-campaign-${code.code}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const share = async () => {
    if (!qrDataUrl || !navigator.share) return;
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], `custosell-campaign-${code.code}.png`, { type: 'image/png' });
      await navigator.share({ title: 'Join Custosell', text: `Use promo code ${code.code}`, files: [file] });
    } catch { /* user cancelled */ }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 space-y-5 relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Campaign Code</p>
          <p className="text-lg font-bold text-gray-900 mt-1 font-mono">{code.code}</p>
        </div>
        <div className="flex justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Campaign QR" width={240} height={240} className="rounded-xl border border-gray-200 p-2" />
          ) : (
            <div className="w-[240px] h-[240px] rounded-xl bg-gray-50 animate-pulse" />
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={download} disabled={!qrDataUrl}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors cursor-pointer">
            <Download className="w-4 h-4" />
            Download
          </button>
          {navigator.share && (
            <button type="button" onClick={share} disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          <span className="text-xs text-gray-500 truncate select-all">{url}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0',
              linkCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200',
            )}
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {linkCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
