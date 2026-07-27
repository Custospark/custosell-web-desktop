import { useState, useEffect, useRef } from 'react';
import { usePaymentInfo, useUpdatePaymentInfo, usePayoutHistory } from './api/useAccountQueries';
import type { ReferralEarnings } from '../referral/api/ReferralTypes';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import {
  Users, DollarSign, Clock, TrendingUp, Wallet, Smartphone, Landmark,
  ChevronDown, ChevronUp, Receipt, Check, X, Building2, ChevronLeft, ChevronRight,
  FileText, Image,
} from 'lucide-react';

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
  const { data: paymentInfoResp, isLoading: paymentLoading } = usePaymentInfo();
  const { data: payoutHistoryResp, isLoading: historyLoading } = usePayoutHistory();
  const updatePaymentInfo = useUpdatePaymentInfo();

  const paymentInfo = paymentInfoResp?.data;
  const payoutHistory = payoutHistoryResp?.data ?? [];

  const totalEarned = (earnings?.total_earned ?? 0) + (earnings?.commission_earned ?? 0);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [form, setForm] = useState({
    payment_method: '', mobile_money_provider: '', mobile_money_number: '',
    bank_name: '', bank_account_name: '', bank_account_number: '', bank_branch: '',
  });

  const formLoaded = useRef(false);
  useEffect(() => {
    if (paymentInfo && !formLoaded.current) {
      formLoaded.current = true;
      setForm({
        payment_method: paymentInfo.payment_method ?? '',
        mobile_money_provider: paymentInfo.mobile_money_provider ?? '',
        mobile_money_number: paymentInfo.mobile_money_number ?? '',
        bank_name: paymentInfo.bank_name ?? '',
        bank_account_name: paymentInfo.bank_account_name ?? '',
        bank_account_number: paymentInfo.bank_account_number ?? '',
        bank_branch: paymentInfo.bank_branch ?? '',
      });
    }
  }, [paymentInfo]);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, string> = {};
    if (form.payment_method === 'mobile_money') {
      payload.payment_method = 'mobile_money';
      payload.mobile_money_provider = form.mobile_money_provider;
      payload.mobile_money_number = form.mobile_money_number;
    } else if (form.payment_method === 'bank') {
      payload.payment_method = 'bank';
      payload.bank_name = form.bank_name;
      payload.bank_account_name = form.bank_account_name;
      payload.bank_account_number = form.bank_account_number;
      payload.bank_branch = form.bank_branch;
    } else {
      payload.payment_method = '';
    }
    updatePaymentInfo.mutate(payload);
  };

  const payoutTotalPaid = payoutHistory
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const referrals = earnings?.referrals ?? [];
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(referrals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageReferrals = referrals.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Earnings summary cards */}
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
          <p className="text-2xl font-bold text-green-700">{formatUSD(earnings?.rewards_paid ?? 0)}</p>
          <p className="text-xs text-green-600 font-medium">Paid</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-amber-400 mb-1" />
          <p className="text-2xl font-bold text-amber-700">{formatUSD(totalEarned - (earnings?.rewards_paid ?? 0))}</p>
          <p className="text-xs text-amber-600 font-medium">Bal.</p>
        </div>
      </div>

      {earnings?.is_sales_rep && (
        <div className="bg-indigo-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">Sales Rep Commission</span>
            {earnings.commission_rate && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                {earnings.commission_rate}{earnings.commission_type === 'percentage' ? '%' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">Earned: <strong className="text-gray-900">{formatUSD(earnings.commission_earned ?? 0)}</strong></span>
            <span className="text-gray-500">Bal.: <strong className="text-amber-700">{formatUSD((earnings.commission_earned ?? 0) - (earnings.commission_paid ?? 0))}</strong></span>
            <span className="text-gray-500">Paid: <strong className="text-green-700">{formatUSD(earnings.commission_paid ?? 0)}</strong></span>
          </div>
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
            {pageReferrals.map((r) => {
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">
                  Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, referrals.length)} of {referrals.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      className={cn(
                        'w-7 h-7 text-xs font-medium rounded-md cursor-pointer',
                        safePage === i ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Payment Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <button
          type="button"
          onClick={() => setShowPaymentForm(!showPaymentForm)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
          </div>
          {showPaymentForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showPaymentForm && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {paymentLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (
              <>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="payment_method" value="mobile_money"
                      checked={form.payment_method === 'mobile_money'}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      className="accent-indigo-600" />
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Mobile Money</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="payment_method" value="bank"
                      checked={form.payment_method === 'bank'}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      className="accent-indigo-600" />
                    <Landmark className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Bank Transfer</span>
                  </label>
                </div>

                {form.payment_method === 'mobile_money' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                      <select value={form.mobile_money_provider}
                        onChange={(e) => setForm({ ...form, mobile_money_provider: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">Select provider</option>
                        <option value="mtn">MTN</option>
                        <option value="airtel">Airtel</option>
                        <option value="vodafone">Vodafone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number</label>
                      <input type="text" value={form.mobile_money_number}
                        onChange={(e) => setForm({ ...form, mobile_money_number: e.target.value })}
                        placeholder="+256 700 000 000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                  </div>
                )}

                {form.payment_method === 'bank' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                      <input type="text" value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. Stanbic Bank"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
                      <input type="text" value={form.bank_account_name}
                        onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} placeholder="Full name on account"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                      <input type="text" value={form.bank_account_number}
                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} placeholder="Account number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <input type="text" value={form.bank_branch}
                        onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} placeholder="Branch name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="submit" disabled={updatePaymentInfo.isPending}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-lg transition-colors cursor-pointer">
                    {updatePaymentInfo.isPending ? 'Saving...' : 'Save Payment Info'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </section>

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
