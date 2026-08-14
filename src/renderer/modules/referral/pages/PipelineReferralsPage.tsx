import { useReferralEarnings } from '../api/useReferralQueries';
import { formatUSD } from '../../../shared/utils/formatCurrency';
import { Gift, Copy, Check, Users, TrendingUp, Wallet, DollarSign, QrCode, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';
import { Table } from '../../../shared/components/tables/Table';
import { Pagination, usePagination } from '../../../shared/components/tables/Pagination';
import type { ReferralRecord } from '../api/ReferralTypes';
import SalesRepBadge from '../../../shared/components/referrals/SalesRepBadge';

export default function PipelineReferralsPage() {
  const { data: earnings, isLoading } = useReferralEarnings();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const referralUrl = earnings?.referral_code
    ? `${window.location.origin}/register?ref=${earnings.referral_code}`
    : '';

  const referrals = earnings?.referrals ?? [];
  const paginated = usePagination(referrals, 10);

  const totalEarned = (earnings?.total_earned ?? 0) + (earnings?.commission_earned ?? 0);
  const totalPaid = (earnings?.rewards_paid ?? 0) + (earnings?.commission_paid ?? 0);

  useEffect(() => {
    if (showQr && referralUrl && !qrDataUrl) {
      QRCodeLib.toDataURL(referralUrl, {
        width: 160,
        margin: 2,
        errorCorrectionLevel: 'M',
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [showQr, referralUrl, qrDataUrl]);

  const copyCode = () => {
    if (earnings?.referral_code) {
      navigator.clipboard.writeText(earnings.referral_code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500">Your Referral Code</p>
            {earnings?.referral_code ? (
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold tracking-wider text-blue-700">
                  {earnings.referral_code}
                </span>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {earnings.referral_code && (
                  <button
                    onClick={() => setShowQr(!showQr)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    <QrCode className="h-4 w-4" />
                    {showQr ? 'Hide QR' : 'QR'}
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">No referral code available</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Share your code with new businesses signing up. You earn rewards when they subscribe!
            </p>
            {showQr && qrDataUrl && (
              <div className="mt-4 flex justify-center">
                <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <img src={qrDataUrl} alt="Referral QR code" width={160} height={160} className="rounded-lg" />
                  <p className="text-[11px] text-gray-500">Scan to open signup with your code</p>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `custosell-referral-${earnings?.referral_code}.png`;
                      link.href = qrDataUrl;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download QR
                  </button>
                  <p className="text-[10px] text-gray-400 break-all text-center max-w-[220px]">{referralUrl}</p>
                </div>
              </div>
            )}
          </div>
          <Gift className="h-8 w-8 shrink-0 text-blue-600" />
        </div>
      </div>

      {/* Stats Cards */}
      {earnings?.is_sales_rep && (
        <div className="flex items-center gap-2">
          <SalesRepBadge rate={earnings.commission_rate ?? null} type={earnings.commission_type ?? null} />
          <span className="text-sm text-gray-500">Commissions are shown on your earnings below</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Referrals</p>
              <p className="text-xl font-semibold text-gray-900">{earnings?.total_referrals ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Earned</p>
              <p className="text-xl font-semibold text-gray-900">
                {earnings ? formatUSD(totalEarned) : formatUSD(0)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Paid</p>
              <p className="text-xl font-semibold text-green-700">{formatUSD(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Bal.</p>
              <p className="text-xl font-semibold text-purple-700">{formatUSD(totalEarned - totalPaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Referral History</h3>
        </div>
        {referrals.length > 0 ? (
          <>
            <Table
              columns={[
                { key: 'business', header: 'Business', render: (r: ReferralRecord) => (
                  <span className="text-sm font-medium text-gray-900">
                    {r.referred_business?.name ?? 'Unknown'}
                  </span>
                )},
                { key: 'status', header: 'Status', render: (r: ReferralRecord) => {
                  const colors: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    active: 'bg-green-100 text-green-800',
                    rewarded: 'bg-blue-100 text-blue-800',
                  };
                  return (
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[r.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {r.status}
                    </span>
                  );
                }},
                { key: 'reward', header: 'Reward', render: (r: ReferralRecord) => {
                  const reward = (Number(r.reward_amount) || 0) + (Number(r.commission_earned) || 0);
                  return (
                    <span className="text-sm text-gray-600">
                      {reward > 0 ? formatUSD(reward) : '-'}
                    </span>
                  );
                }},
                { key: 'date', header: 'Date', render: (r: ReferralRecord) => (
                  <span className="text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('en-UG')}
                  </span>
                )},
              ]}
              data={paginated.data}
            />
            <div className="border-t border-gray-200 px-6 py-3">
              <Pagination
                currentPage={paginated.page}
                totalPages={paginated.totalPages}
                totalItems={paginated.totalItems}
                pageSize={paginated.pageSize}
                onPageChange={paginated.setPage}
                onPageSizeChange={paginated.setPageSize}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Gift className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No referrals yet</p>
            <p className="text-xs text-gray-400">
              Share your referral code to earn rewards when businesses sign up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
