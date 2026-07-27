import { useState, useEffect, useCallback, useRef } from 'react';
import { useReferralEarnings, useGenerateReferralCode } from '../referral/api/useReferralQueries';
import { usePaymentInfo, useUpdatePaymentInfo, usePayoutHistory } from './api/useAccountQueries';
import { formatUSD } from '../../shared/utils/formatCurrency';
import { cn } from '../../shared/utils/cn';
import QRCodeLib from 'qrcode';
import {
  Gift, Copy, Check, Users, UserCheck, DollarSign, Sparkles, QrCode,
  Download, Share2, X, Clock, Smartphone, Landmark, TrendingUp,
  ChevronDown, ChevronUp, Wallet, Receipt,
} from 'lucide-react';

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  paid: { icon: <Check className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  scheduled: { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
  cancelled: { icon: <X className="w-4 h-4" />, color: 'text-red-600 bg-red-50' },
};

export default function AccountReferralsPage() {
  const { data: earnings, isLoading: earningsLoading } = useReferralEarnings();
  const { data: paymentInfoResp, isLoading: paymentLoading } = usePaymentInfo();
  const { data: payoutHistoryResp, isLoading: historyLoading } = usePayoutHistory();
  const generateCode = useGenerateReferralCode();
  const updatePaymentInfo = useUpdatePaymentInfo();

  const code = earnings?.referral_code;
  const paymentInfo = paymentInfoResp?.data;
  const payoutHistory = payoutHistoryResp?.data ?? [];

  const [copied, setCopied] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);

  const [form, setForm] = useState({
    payment_method: '',
    mobile_money_provider: '',
    mobile_money_number: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
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

  const referralUrl = code ? `${window.location.origin}/auth/register?ref=${code}` : '';

  useEffect(() => {
    if (qrModal && referralUrl && !qrDataUrl) {
      QRCodeLib.toDataURL(referralUrl, {
        width: 240, margin: 2, errorCorrectionLevel: 'M',
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [qrModal, referralUrl, qrDataUrl]);

  const handleQrDownload = useCallback(() => {
    if (!qrDataUrl) return;
    setQrDownloading(true);
    const link = document.createElement('a');
    link.download = `custosell-referral-${code}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setQrDownloading(false);
  }, [qrDataUrl, code]);

  const handleQrShare = useCallback(async () => {
    if (!qrDataUrl || !navigator.share) return;
    try {
      const blob = await (await fetch(qrDataUrl)).blob();
      const file = new File([blob], `custosell-referral-${code}.png`, { type: 'image/png' });
      await navigator.share({ title: 'Join Custosell', text: `Use my referral code ${code}`, files: [file] });
    } catch { /* user cancelled */ }
  }, [qrDataUrl, code]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const totalEarned = (earnings?.total_earned ?? 0) + (earnings?.commission_earned ?? 0);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your referral code, earnings, and payout information</p>
      </div>

      {/* Referral Code Section */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Your Referral Code</h2>
        </div>

        {earningsLoading ? (
          <div className="py-4 text-sm text-gray-400">Loading...</div>
        ) : !code ? (
          <div className="py-4 text-center space-y-3">
            <Sparkles className="w-10 h-10 mx-auto text-indigo-300" />
            <p className="text-sm text-gray-500">You haven't created a referral code yet</p>
            <button
              type="button"
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              {generateCode.isPending ? 'Generating...' : 'Generate Referral Code'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
              <code className="text-lg font-bold text-gray-900 tracking-wider select-all">{code}</code>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> QR
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    'flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer',
                    copied ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200',
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 break-all">{referralUrl}</p>
          </>
        )}
      </section>

      {/* Earnings Summary */}
      {code && (
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Earnings</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{earnings?.total_referrals ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">Referrals</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <UserCheck className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{earnings?.active_referrals ?? 0}</p>
              <p className="text-xs text-gray-500 font-medium">Active</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-gray-400 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{formatUSD(totalEarned)}</p>
              <p className="text-xs text-gray-500 font-medium">Total Earned</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-amber-400 mb-1" />
              <p className="text-2xl font-bold text-amber-700">{formatUSD(earnings?.pending_rewards ?? 0)}</p>
              <p className="text-xs text-amber-600 font-medium">Pending</p>
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
                <span className="text-gray-500">Pending: <strong className="text-amber-700">{formatUSD(earnings.commission_pending ?? 0)}</strong></span>
                <span className="text-gray-500">Paid: <strong className="text-green-700">{formatUSD(earnings.commission_paid ?? 0)}</strong></span>
              </div>
            </div>
          )}
        </section>
      )}

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
                    <input
                      type="radio"
                      name="payment_method"
                      value="mobile_money"
                      checked={form.payment_method === 'mobile_money'}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      className="accent-indigo-600"
                    />
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Mobile Money</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank"
                      checked={form.payment_method === 'bank'}
                      onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      className="accent-indigo-600"
                    />
                    <Landmark className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Bank Transfer</span>
                  </label>
                </div>

                {form.payment_method === 'mobile_money' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                      <select
                        value={form.mobile_money_provider}
                        onChange={(e) => setForm({ ...form, mobile_money_provider: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select provider</option>
                        <option value="mtn">MTN</option>
                        <option value="airtel">Airtel</option>
                        <option value="vodafone">Vodafone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        value={form.mobile_money_number}
                        onChange={(e) => setForm({ ...form, mobile_money_number: e.target.value })}
                        placeholder="+256 700 000 000"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {form.payment_method === 'bank' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={form.bank_name}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        placeholder="e.g. Stanbic Bank"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={form.bank_account_name}
                        onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                        placeholder="Full name on account"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={form.bank_account_number}
                        onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                        placeholder="Account number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                      <input
                        type="text"
                        value={form.bank_branch}
                        onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                        placeholder="Branch name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updatePaymentInfo.isPending}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
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
              const st = STATUS_ICONS[payout.status] ?? { icon: null, color: 'text-gray-600 bg-gray-50' };
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
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 space-y-5 relative">
            <button type="button" onClick={() => { setQrModal(false); setQrDataUrl(null); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Share Your Code</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{code}</p>
            </div>
            <div className="flex justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Referral QR" width={240} height={240} className="rounded-xl border border-gray-200 p-2" />
              ) : (
                <div className="w-[240px] h-[240px] rounded-xl bg-gray-50 animate-pulse" />
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleQrDownload} disabled={!qrDataUrl || qrDownloading}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors cursor-pointer">
                <Download className="w-4 h-4" /> Download
              </button>
              {navigator.share && (
                <button type="button" onClick={handleQrShare} disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 text-center break-all">{referralUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
