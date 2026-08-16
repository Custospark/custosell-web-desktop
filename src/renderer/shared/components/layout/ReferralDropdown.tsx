import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../app/routes/constants/shared.paths';
import { useReferralEarnings, useGenerateReferralCode } from '../../../modules/referral/api/useReferralQueries';
import SalesRepBadge from '../referrals/SalesRepBadge';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { cn } from '../../utils/cn';
import { formatUSD } from '../../utils/formatCurrency';
import { canAccessModule } from '../../utils/moduleAccess';
import QRCodeLib from 'qrcode';
import { useNetworkStatus } from '../../../app/store/hooks/useNetworkStatus';
import { OfflineDropdownNotice } from './OfflineDropdownNotice';
import {
  Gift, Copy, Check, ExternalLink, Users, DollarSign,
  Sparkles, ChevronDown, QrCode, Download, X, Share2, Link,
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
  const [linkCopied, setLinkCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAppSelector((s) => s.auth.user);
  const { isCompletelyOffline } = useNetworkStatus();
  const { data: earnings, isLoading } = useReferralEarnings();
  const hasPipelineAccess = canAccessModule(user, 'pipeline');

  const code = earnings?.referral_code;
  const generateCode = useGenerateReferralCode();
  const [qrModal, setQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);
  const referralUrl = code ? `${window.location.origin}/register?ref=${code}` : '';

  useEffect(() => {
    if (qrModal && referralUrl && !qrDataUrl) {
      QRCodeLib.toDataURL(referralUrl, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M',
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
    } catch { /* user cancelled share */ }
  }, [qrDataUrl, code]);

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
      // fallback - ignore
    }
  };

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback - ignore
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
  const totalPaid = (earnings?.rewards_paid ?? 0) + (earnings?.commission_paid ?? 0);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2 lg:gap-2 lg:px-3 py-1.5 rounded-lg ring-1 cursor-pointer transition-colors',
          'text-xs lg:text-sm',
          open ? 'bg-indigo-50 ring-indigo-300' : 'bg-white ring-indigo-200 hover:bg-indigo-50/60 hover:ring-indigo-300',
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
        <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm max-h-[calc(100vh-5rem)] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl z-50 lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:-translate-x-0 lg:mt-2 lg:w-80">
          <div className="px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-200 shrink-0">
                <Gift className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Referral Program</p>
                <p className="text-xs text-gray-500">Earn rewards by referring businesses</p>
              </div>
              {isSalesRep && (
                <SalesRepBadge rate={earnings?.commission_rate ?? null} type={earnings?.commission_type ?? null} />
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">Loading...</div>
          ) : isCompletelyOffline ? (
            <OfflineDropdownNotice />
          ) : !hasReferralCode ? (
            <div className="px-4 py-6 text-center space-y-3">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-300" />
              <p className="text-sm text-gray-500">No referral code yet</p>
              <p className="text-xs text-gray-400">Generate your code to start earning rewards</p>
              <button
                type="button"
                onClick={() => generateCode.mutate()}
                disabled={generateCode.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                {generateCode.isPending ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <code className="text-sm font-bold text-gray-900 tracking-wider select-all">{code}</code>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQrModal(true)}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        QR
                      </button>
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
                  <div className="flex items-center justify-between mt-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-xs text-gray-500 truncate mr-2 select-all">{referralUrl}</span>
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
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                      {linkCopied ? 'Copied' : 'Link'}
                    </button>
                  </div>
              </div>

              <div className="px-4 py-3 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="text-center">
                    <Users className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{earnings?.total_referrals ?? 0}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Referrals</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{formatUSD(totalEarned)}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Earned</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold text-green-700">{formatUSD(totalPaid)}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Paid</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{formatUSD(totalEarned - totalPaid)}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Bal.</p>
                  </div>
                </div>
              </div>

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

              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => handleNavigate(ROUTES.ACCOUNT.REFERRALS)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer text-indigo-600 font-semibold"
                >
                  <span>Referral Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                {hasPipelineAccess && (
                  <button
                    type="button"
                    onClick={() => handleNavigate(ROUTES.PIPELINE.REFERRALS)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 cursor-pointer text-gray-600 font-medium"
                  >
                    <span>Pipeline Referrals</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                <Download className="w-4 h-4" />
                Download
              </button>
              {'share' in navigator && (
                <button type="button" onClick={handleQrShare} disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-xs text-gray-500 truncate select-all">{referralUrl}</span>
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
      )}
    </div>
  );
}