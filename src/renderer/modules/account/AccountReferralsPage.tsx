import { useState, useEffect, useCallback } from 'react';
import { useReferralEarnings, useGenerateReferralCode } from '../referral/api/useReferralQueries';

import { cn } from '../../shared/utils/cn';
import QRCodeLib from 'qrcode';

import {
  Gift, Copy, Check, Sparkles, QrCode, Download, Share2, X,
  Trophy, ScrollText, LifeBuoy,
} from 'lucide-react';
import AccountReferralsWinsTab from './AccountReferralsWinsTab';
import AccountReferralsPolicyTab from './AccountReferralsPolicyTab';
import AccountReferralsHelpTab from './AccountReferralsHelpTab';

type TabId = 'wins' | 'policy' | 'help';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'wins', label: 'Wins', icon: <Trophy className="w-4 h-4" /> },
  { id: 'policy', label: 'Policy', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'help', label: 'Help & Contact', icon: <LifeBuoy className="w-4 h-4" /> },
];

export default function AccountReferralsPage() {
  const { data: earnings, isLoading: earningsLoading } = useReferralEarnings();
  const generateCode = useGenerateReferralCode();

  const code = earnings?.referral_code;

  const [activeTab, setActiveTab] = useState<TabId>('wins');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrModal, setQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrDownloading, setQrDownloading] = useState(false);

  const referralUrl = code ? `${window.location.origin}/register?ref=${code}` : '';

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

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
                <button type="button" onClick={() => setQrModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200 cursor-pointer">
                  <QrCode className="w-3.5 h-3.5" /> QR
                </button>
                <button type="button" onClick={handleCopy}
                  className={cn('flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer',
                    copied ? 'bg-green-100 text-green-700' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-gray-200')}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 break-all">{referralUrl}</p>
          </>
        )}
      </section>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'wins' && <AccountReferralsWinsTab earnings={earnings} />}
      {activeTab === 'policy' && <AccountReferralsPolicyTab />}
      {activeTab === 'help' && <AccountReferralsHelpTab />}

      {/* QR Modal */}
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
                <Download className="w-4 h-4" /> Download
              </button>
              {navigator.share && (
                <button type="button" onClick={handleQrShare} disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">
                  <Share2 className="w-4 h-4" /> Share
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
