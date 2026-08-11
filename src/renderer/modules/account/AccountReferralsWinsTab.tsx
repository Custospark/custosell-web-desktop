import { usePayoutHistory } from './api/useAccountQueries';
import type { ReferralEarnings } from '../referral/api/ReferralTypes';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import { useAppSelector } from '../../app/store/hooks/useApp';
import SalesRepBadge from '../../shared/components/referrals/SalesRepBadge';
import {
  Users, DollarSign, Clock, TrendingUp, Wallet,
  Receipt, Check, X, Building2,
  FileText, Image,
} from 'lucide-react';
import { Pagination, usePagination } from '../../shared/components/tables/Pagination';
import { PaymentInfoSection } from './components/PaymentInfoSection';

const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-amber-400', label: 'Pending' },
  active: { dot: 'bg-green-500', label: 'Active' },
  rewarded: { dot: 'bg-blue-500', label: 'Rewarded' },
};

const STATUS_PAYOUT_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  paid: { icon: <Check className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  scheduled: { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
  cancelled: { icon: <X className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
};

export default function AccountReferralsWinsTab({ earnings }: { earnings: ReferralEarnings | undefined }) {
  const { data: payoutHistoryResp, isLoading: historyLoading } = usePayoutHistory();
  const isBusinessOwner = Boolean(useAppSelector((s) => s.auth.user)?.is_business_owner);

  const payoutHistory = payoutHistoryResp ?? [];

  const totalEarned = (earnings?.total_earned ?? 0) + (earnings?.commission_earned ?? 0);
  const totalPaid = (earnings?.rewards_paid ?? 0) + (earnings?.commission_paid ?? 0);

  const payoutTotalPaid = payoutHistory
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const referrals = earnings?.referrals ?? [];
  const paginated = usePagination(referrals, PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Earnings summary cards */}
      {earnings?.is_sales_rep && (
        <div className="flex items-center gap-2">
          <SalesRepBadge rate={earnings.commission_rate ?? null} type={earnings.commission_type ?? null} />
          <span className="text-xs text-gray-500">Commissions are shown on your earnings below</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{earnings?.total_referrals ?? 0}</p>
          <p className="text-xs text-gray-500 font-medium">Referrals</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto text-gray-400 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{formatUSD(totalEarned)}</p>
          <p className="text-xs text-gray-500 font-medium">Earned</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <Wallet className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-green-700">{formatUSD(totalPaid)}</p>
          <p className="text-xs text-green-600 font-medium">Paid</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-amber-400 mb-1" />
          <p className="text-2xl font-bold text-amber-700">{formatUSD(totalEarned - totalPaid)}</p>
          <p className="text-xs text-amber-600 font-medium">Bal.</p>
        </div>
      </div>

      {/* Promo credit is a business-level billing asset (used against subscription
          charges), so it shows to the business owner only — same gate as the
          subscription dropdown. Staff and personal accounts never see it. */}
      {isBusinessOwner && (earnings?.available_credit ?? 0) > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Promo credit available</span>
          </div>
          <span className="text-sm font-bold text-green-700">{formatUSD(earnings!.available_credit)}</span>
        </div>
      )}

      {/* Referred Businesses (Wins) */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Referred Businesses</h2>
          <span className="text-xs text-gray-400 font-medium ml-auto">{referrals.length} total</span>
        </div>

        {referrals.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            You haven't referred any businesses yet. Share your referral code to earn rewards.
          </p>
        ) : (
          <div className="space-y-2">
            {paginated.data.map((r) => {
              const st = STATUS_STYLES[r.status] ?? { dot: 'bg-gray-400', label: r.status };
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.referred_business?.name ?? 'Business #' + r.referred_business_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString()}
                        {Number(r.reward_amount) > 0 && ` · ${formatUSD(Number(r.reward_amount))} earned`}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 shrink-0 ml-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                    <span className="text-xs text-gray-500 font-medium">{st.label}</span>
                  </span>
                </div>
              );
            })}

            <Pagination
              currentPage={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.totalItems}
              pageSize={paginated.pageSize}
              onPageChange={paginated.setPage}
              onPageSizeChange={paginated.setPageSize}
            />
          </div>
        )}
      </section>

      {/* Payment Info */}
      <PaymentInfoSection />

      {/* Payout History */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
          {payoutTotalPaid > 0 && (
            <span className="text-sm text-green-600 font-medium ml-auto">
              Total paid: {formatUSD(payoutTotalPaid)}
            </span>
          )}
        </div>

        {historyLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : payoutHistory.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No payouts yet. Earn referral rewards to see your payout history.
          </p>
        ) : (
          <div className="space-y-2">
            {payoutHistory.map((payout) => {
              const st = STATUS_PAYOUT_ICONS[payout.status] ?? { icon: null, color: 'text-gray-600 bg-gray-50' };
              return (
                <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', st.color)}>
                      {st.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{formatUSD(payout.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {payout.status === 'paid' && payout.paid_at
                          ? `Paid on ${new Date(payout.paid_at).toLocaleDateString()}`
                          : payout.status === 'scheduled'
                            ? `Scheduled for ${payout.scheduled_at ? new Date(payout.scheduled_at).toLocaleDateString() : 'N/A'}`
                            : 'Cancelled'}
                        {payout.paid_by_user && ` by ${payout.paid_by_user.name}`}
                      </p>
                    </div>
                  </div>
                      {payout.notes && (
                        <span className="text-xs text-gray-400 max-w-[160px] truncate">{payout.notes}</span>
                      )}
                      {payout.attachments && payout.attachments.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {payout.attachments.map((a, i) => (
                            <a
                              key={i}
                              href={a.file_url ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-gray-200/60 px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                            >
                              {a.mime_type?.startsWith('image/') ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                              {a.original_name}
                            </a>
                          ))}
                        </div>
                      )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
