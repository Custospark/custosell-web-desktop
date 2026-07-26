import { useReferralEarnings } from '../api/useReferralQueries';
import { formatCurrency } from '../../../shared/utils/formatCurrency';
import { Gift, Copy, Check, Users, TrendingUp, Wallet, Percent } from 'lucide-react';
import { useState } from 'react';
import { Table } from '../../../shared/components/tables/Table';
import type { ReferralRecord } from '../api/ReferralTypes';

export default function PipelineReferralsPage() {
  const { data: earnings, isLoading } = useReferralEarnings();
  const [copied, setCopied] = useState(false);

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
        <div className="flex items-center justify-between">
          <div>
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
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">No referral code available</p>
            )}
          </div>
          <Gift className="h-8 w-8 text-blue-600" />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Share your code with new businesses signing up. You earn rewards when they subscribe!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Referrals</p>
              <p className="text-xl font-semibold text-gray-900">{earnings?.total_referrals ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Referrals</p>
              <p className="text-xl font-semibold text-gray-900">{earnings?.active_referrals ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Wallet className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Earned</p>
              <p className="text-xl font-semibold text-gray-900">
                {earnings ? formatCurrency(earnings.total_earned) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Rewards */}
      {(earnings?.pending_rewards ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <Wallet className="h-5 w-5" />
            <span className="font-medium">
              Pending rewards: {formatCurrency(earnings!.pending_rewards)}
            </span>
          </div>
          <p className="mt-1 text-sm text-amber-600">
            Rewards are credited when referred businesses complete their first payment.
          </p>
        </div>
      )}

      {/* Sales Rep Commission Section */}
      {earnings?.is_sales_rep && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
          <div className="flex items-center gap-2 text-purple-800">
            <Percent className="h-5 w-5" />
            <span className="font-semibold">Sales Representative Commission</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-purple-600">Rate</p>
              <p className="text-lg font-semibold text-purple-900">
                {earnings.commission_type === 'percentage'
                  ? `${earnings.commission_rate}%`
                  : formatCurrency(earnings.commission_rate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Available to Claim</p>
              <p className="text-lg font-semibold text-purple-900">
                {formatCurrency(earnings.commission_pending)}
              </p>
            </div>
            <div>
              <p className="text-sm text-purple-600">Total Earned</p>
              <p className="text-lg font-semibold text-purple-900">
                {formatCurrency(earnings.commission_earned)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-purple-600">
            Contact the Custosell team to claim your pending commission of {formatCurrency(earnings.commission_pending)}.
          </p>
        </div>
      )}

      {/* Referral History Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Referral History</h3>
        </div>
        {earnings?.referrals && earnings.referrals.length > 0 ? (
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
              { key: 'reward', header: 'Reward', render: (r: ReferralRecord) => (
                <span className="text-sm text-gray-600">
                  {r.reward_amount ? formatCurrency(r.reward_amount) : '—'}
                </span>
              )},
              { key: 'date', header: 'Date', render: (r: ReferralRecord) => (
                <span className="text-sm text-gray-500">
                  {new Date(r.created_at).toLocaleDateString('en-UG')}
                </span>
              )},
            ]}
            data={earnings.referrals}
          />
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
