import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useReferralEarnings } from '../../../modules/referral/api/useReferralQueries';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../utils/cn';
import { formatUSD } from '../../utils/formatCurrency';
import { canAccessModule } from '../../utils/moduleAccess';
import {
  Gift, Copy, Check, ExternalLink, Users, UserCheck, DollarSign,
  TrendingUp, Clock, Sparkles, ChevronDown,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-amber-400', label: 'Pending' },
  active: { dot: 'bg-green-500', label: 'Active' },
  rewarded: { dot: 'bg-blue-500', label: 'Rewarded' },
};

export default function ReferralDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAppSelector((s) => s.auth.user);
  const { data: earnings, isLoading } = useReferralEarnings();
  const hasPipelineAccess = canAccessModule(user, 'pipeline');

  const code = earnings?.referral_code;
  const isSalesRep = earnings?.is_sales_rep ?? false;
  const recentReferrals = useMemo(
    () => (earnings?.referrals ?? []).slice(0, 3),
    [earnings?.referrals],
  );

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — ignore
    }
  };

  const handleNavigate = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasReferralCode = !!code;
  const totalEarned = (earnings?.total_earned ?? 0) + (earnings?.commission_earned ?? 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 lg:gap-2 lg:px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition-colors',
          'text-xs lg:text-sm',
          open ? 'bg-gray-100 ring-gray-300' : 'bg-white ring-gray-200 hover:bg-gray-50',
        )}
        title={hasReferralCode ? `Referral code: ${code}` : 'Referral Program'}
        aria-label="Referral Program"
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-indigo-200 bg-indigo-50 shrink-0">
          <Gift className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        <div className="hidden lg:block min-w-0 max-w-[140px]">
          <span className="text-xs font-semibold truncate block text-gray-900">Refer &amp; Earn</span>
          <span className="block text-xs truncate text-gray-500">{hasReferralCode ? (totalEarned > 0 ? `${formatUSD(totalEarned)} earned` : 'Get your referral code') : 'Start referring'}</span>
        </div>
        <ChevronDown className={cn('w-3 h-3 transition-transform shrink-0 text-gray-400', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-200 shrink-0">
                <Gift className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Referral Program</p>
                <p className="text-xs text-gray-500">Earn rewards by referring businesses</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
          ) : !hasReferralCode ? (
            <div className="px-4 py-6 text-center space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-300" />
              <p className="text-sm text-gray-500">No referral code yet</p>
              <p className="text-xs text-gray-400">Start referring businesses to earn rewards</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <code className="text-sm font-bold text-gray-900 tracking-wider select-all">{code}</code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer',
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200',
                    )}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <Users className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{earnings?.total_referrals ?? 0}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Referrals</p>
                  </div>
                  <div className="text-center">
                    <UserCheck className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{earnings?.active_referrals ?? 0}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Active</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{formatUSD(totalEarned)}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Earned</p>
                  </div>
                </div>
              </div>

              {(earnings?.pending_rewards ?? 0) > 0 && (
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-amber-800 font-medium">
                      {formatUSD(earnings!.pending_rewards)} pending rewards
                    </span>
                  </div>
                </div>
              )}

              {isSalesRep && (
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-gray-700">Sales Rep Commission</span>
                    {earnings?.commission_rate && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {earnings.commission_rate}{earnings.commission_type === 'percentage' ? '%' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Earned: <strong className="text-gray-900">{formatUSD(earnings?.commission_earned ?? 0)}</strong></span>
                    <span className="text-gray-500">Pending: <strong className="text-amber-700">{formatUSD(earnings?.commission_pending ?? 0)}</strong></span>
                  </div>
                </div>
              )}

              {recentReferrals.length > 0 && (
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recent</p>
                  <div className="space-y-1.5">
                    {recentReferrals.map((r) => {
                      const st = STATUS_STYLES[r.status] ?? { dot: 'bg-gray-400', label: r.status };
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-700 truncate">
                            {r.referred_business?.name ?? 'Business #' + r.referred_business_id}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                            <span className="text-[10px] text-gray-500 font-medium">{st.label}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-2">
                {hasPipelineAccess ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(ROUTES.PIPELINE.REFERRALS)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer text-indigo-600 font-semibold"
                  >
                    <span>View full details</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="px-3 py-2 text-xs text-center text-gray-400">
                    Upgrade to a plan with Pipeline to view full referral details
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}