import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, MessageCircle, Store } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { useToast } from '../../../../app/contexts/useToast';
import { ROUTES } from '../../../../app/routes/constants/shared.paths';
import { avatarUrl } from '../../../../shared/utils/avatarUrl';
import { sanitizeErrorMessage } from '../../../../app/store/offline/core/offlineQueryUtils';
import {
  useBusiness,
  useCheckSlugAvailable,
  useUpdateStorefrontProfile,
} from '../../../settings/api/settings/BusinessQueries';
import { storefrontShareUrl, whatsappShareUrl } from '../../../storefront/storefrontShare';
import {
  StorefrontQrCode,
  StorefrontQrDownloadButton,
} from '../../../storefront/ui/StorefrontQrCode';
import {
  ShopUsernameField,
  type SlugCheckStatus,
} from './ShopUsernameField';

const DEBOUNCE_MS = 400;
const SETTINGS_QR_SIZE = 220;

const actionLinkClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50';

/** Business-level public shop switch + shareable @slug. */
export function BusinessStorefrontCard() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const { data: business, isLoading } = useBusiness();
  const updateProfile = useUpdateStorefrontProfile();
  const checkSlug = useCheckSlugAvailable();

  const [draft, setDraft] = useState<{ enabled: boolean; slug: string } | null>(null);
  const [checkStatus, setCheckStatus] = useState<SlugCheckStatus>('idle');
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [checkedSlug, setCheckedSlug] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  if (isLoading || !business) return null;

  const savedSlug = (business.slug ?? '').trim();
  const enabled = draft?.enabled ?? Boolean(business.storefront_enabled);
  const slug = draft?.slug ?? savedSlug;
  const slugTrimmed = slug.trim();
  const slugChanged = slugTrimmed !== savedSlug;
  const dirty =
    enabled !== Boolean(business.storefront_enabled) || slugChanged;
  const previewUrl = slugTrimmed ? storefrontShareUrl(slugTrimmed) : '';
  const liveUrl = savedSlug ? storefrontShareUrl(savedSlug) : '';
  const logoSrc = avatarUrl(business.logo_path);
  const busy = isOffline || updateProfile.isPending;

  const slugConfirmed =
    !slugChanged
    || (checkStatus === 'available' && checkedSlug === slugTrimmed);

  const canSave =
    dirty
    && !busy
    && !checkSlug.isPending
    && (enabled
      ? slugTrimmed.length >= 2 && slugConfirmed
      : !slugChanged || slugTrimmed.length === 0 || slugConfirmed);

  const runSlugCheck = (value: string) => {
    const next = value.trim();
    if (!next) {
      setCheckStatus('idle');
      setSlugHint(null);
      setCheckedSlug(null);
      return;
    }
    if (next === savedSlug) {
      setCheckStatus('own');
      setSlugHint('This is your current shop username.');
      setCheckedSlug(next);
      return;
    }

    const reqId = ++requestIdRef.current;
    setCheckStatus('checking');
    setSlugHint('Checking availability…');
    checkSlug.mutate(next, {
      onSuccess: (res) => {
        if (reqId !== requestIdRef.current) return;
        setDraft((d) => ({
          enabled: d?.enabled ?? enabled,
          slug: res.slug || next,
        }));
        if (res.available) {
          setCheckStatus('available');
          setSlugHint(`@${res.slug} is available`);
          setCheckedSlug(res.slug);
        } else {
          setCheckStatus('unavailable');
          setSlugHint(res.reason ?? 'Not available');
          setCheckedSlug(null);
        }
      },
      onError: (e) => {
        if (reqId !== requestIdRef.current) return;
        setCheckStatus('unavailable');
        setSlugHint(sanitizeErrorMessage(e, 'Could not check username'));
        setCheckedSlug(null);
      },
    });
  };

  const scheduleDebouncedCheck = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSlugCheck(value), DEBOUNCE_MS);
  };

  const handleSlugChange = (next: string) => {
    setDraft({ enabled, slug: next });
    setCheckStatus('idle');
    setSlugHint(null);
    setCheckedSlug(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = next.trim();
    if (!trimmed || trimmed === savedSlug) {
      if (trimmed === savedSlug) {
        setCheckStatus('own');
        setSlugHint('This is your current shop username.');
        setCheckedSlug(trimmed);
      }
      return;
    }
    scheduleDebouncedCheck(next);
  };

  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex min-w-0 items-start gap-3">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-12 sm:w-12"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 sm:h-12 sm:w-12">
            <Store className="h-5 w-5" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-gray-900">Public shop</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
            Share your shop link on TikTok, WhatsApp, or Facebook. Guests browse listed products and send order requests — no online payment.
          </p>
          <p className="mt-1 text-xs leading-snug text-gray-500">
            Shop logo appears on Discover.{' '}
            <Link to={ROUTES.SETTINGS.BUSINESS} className="font-semibold text-blue-700 hover:underline">
              Change logo in Business settings
            </Link>
          </p>
        </div>
      </div>

      {isOffline ? (
        <p className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Shop settings require an internet connection.
        </p>
      ) : null}

      <label className="flex min-w-0 items-start gap-2.5 text-sm text-gray-800 sm:items-center">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => setDraft({ enabled: e.target.checked, slug })}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 sm:mt-0"
        />
        <span className="min-w-0 leading-snug">Enable my public shop</span>
      </label>

      <div className="mt-4 min-w-0">
        <ShopUsernameField
          slug={slug}
          disabled={busy}
          checkStatus={checkStatus}
          hint={slugHint}
          checkPending={checkSlug.isPending}
          onSlugChange={handleSlugChange}
          onCheck={() => runSlugCheck(slug)}
          onBlurCheck={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (!slugTrimmed || slugTrimmed === savedSlug) return;
            if (checkedSlug === slugTrimmed && checkStatus === 'available') return;
            runSlugCheck(slug);
          }}
        />
        {previewUrl ? (
          <p className="mt-2 break-all text-xs leading-snug text-gray-500">
            {slugChanged ? (
              <>
                <span className="font-medium text-amber-800">Preview (unsaved): </span>
                {previewUrl}
              </>
            ) : (
              <>
                <span className="font-medium text-gray-700">Live link: </span>
                {previewUrl}
              </>
            )}
          </p>
        ) : null}
        {dirty ? (
          <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900">
            Unsaved changes — Save to publish this username and shop visibility.
          </p>
        ) : null}
      </div>

      {business.storefront_enabled && savedSlug ? (
        <div className="mt-4 min-w-0 space-y-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:p-4">
          <StorefrontQrCode
            slug={savedSlug}
            size={SETTINGS_QR_SIZE}
            label="Scan to open your public shop"
            className="mx-auto"
          />
          <p className="break-all text-center text-[11px] leading-snug text-gray-500">{liveUrl}</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <StorefrontQrDownloadButton slug={savedSlug} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!savedSlug}
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(storefrontShareUrl(savedSlug));
                showToast('success', 'Shop link copied');
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy link
            </Button>
            <a
              href={whatsappShareUrl(`Order from ${business.name}: ${liveUrl}`)}
              target="_blank"
              rel="noreferrer"
              className={actionLinkClass}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              WhatsApp
            </a>
            <Link to={ROUTES.SHOP(savedSlug)} className={actionLinkClass}>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open shop
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex pt-4 sm:justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          loading={updateProfile.isPending}
          className="h-9 w-full sm:w-auto"
          onClick={() => {
            if (!slugTrimmed) {
              showToast('error', 'Choose a shop username before saving.');
              return;
            }
            if (slugChanged && !slugConfirmed) {
              showToast('error', 'Check that your username is available before saving.');
              return;
            }
            updateProfile.mutate(
              {
                storefront_enabled: enabled,
                slug: slugTrimmed,
              },
              {
                onSuccess: (saved) => {
                  setDraft(null);
                  setCheckStatus('own');
                  setCheckedSlug((saved.slug ?? slugTrimmed).trim());
                  setSlugHint(null);
                  const live = (saved.slug ?? slugTrimmed).trim();
                  showToast(
                    'success',
                    enabled
                      ? `Shop settings saved — live at @${live}`
                      : 'Shop settings saved',
                  );
                },
                onError: (e) =>
                  showToast('error', sanitizeErrorMessage(e, 'Could not save shop settings')),
              },
            );
          }}
        >
          Save shop settings
        </Button>
      </div>
    </section>
  );
}
