import { useState } from 'react';
import { Store } from 'lucide-react';
import { Button } from '../../../../shared/components/buttons/Button';
import { useAppSelector } from '../../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../../app/store/slices/networkSlice';
import { useToast } from '../../../../app/contexts/useToast';
import {
  useBusiness,
  useCheckSlugAvailable,
  useUpdateStorefrontProfile,
} from '../../../settings/api/settings/BusinessQueries';
import { storefrontShareUrl, whatsappShareUrl } from '../../../storefront/storefrontShare';

/** Business-level public shop switch + shareable @slug. */
export function BusinessStorefrontCard() {
  const isOffline = useAppSelector(selectIsCompletelyOffline);
  const { showToast } = useToast();
  const { data: business, isLoading } = useBusiness();
  const updateProfile = useUpdateStorefrontProfile();
  const checkSlug = useCheckSlugAvailable();

  const [draft, setDraft] = useState<{ enabled: boolean; slug: string } | null>(null);
  const [slugHint, setSlugHint] = useState<string | null>(null);

  if (isLoading || !business) return null;

  const enabled = draft?.enabled ?? Boolean(business.storefront_enabled);
  const slug = draft?.slug ?? (business.slug ?? '');
  const dirty =
    enabled !== Boolean(business.storefront_enabled)
    || slug.trim() !== (business.slug ?? '');
  const previewUrl = slug.trim() ? storefrontShareUrl(slug.trim()) : '';

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Store className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Public shop</h2>
          <p className="mt-0.5 text-sm text-gray-600">
            Share your shop link on TikTok, WhatsApp, or Facebook. Guests browse listed products and send order requests — no online payment.
          </p>
        </div>
      </div>

      {isOffline ? (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Shop settings require an internet connection.
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={enabled}
          disabled={isOffline || updateProfile.isPending}
          onChange={(e) => setDraft({ enabled: e.target.checked, slug })}
          className="rounded border-gray-300 text-blue-600"
        />
        Enable my public shop
      </label>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="shop_slug">
          Shop username
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">@</span>
          <input
            id="shop_slug"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={slug}
            disabled={isOffline || updateProfile.isPending}
            onChange={(e) => {
              setDraft({
                enabled,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              });
              setSlugHint(null);
            }}
            onBlur={() => {
              if (!slug.trim() || slug.trim() === business.slug) return;
              checkSlug.mutate(slug.trim(), {
                onSuccess: (res) => {
                  setDraft({ enabled, slug: res.slug });
                  setSlugHint(res.available ? 'Available' : (res.reason ?? 'Not available'));
                },
              });
            }}
            placeholder="your-shop-name"
            maxLength={80}
          />
        </div>
        {slugHint ? (
          <p className={`mt-1 text-xs ${slugHint === 'Available' ? 'text-emerald-600' : 'text-amber-700'}`}>{slugHint}</p>
        ) : null}
        {previewUrl ? (
          <p className="mt-2 text-xs text-gray-500 break-all">{previewUrl}</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!business.slug}
          onClick={async () => {
            const url = storefrontShareUrl(business.slug);
            await navigator.clipboard.writeText(url);
            showToast('success', 'Shop link copied');
          }}
        >
          Copy shop link
        </Button>
        <a
          href={whatsappShareUrl(`Order from ${business.name}: ${storefrontShareUrl(business.slug)}`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Share on WhatsApp
        </a>
        {business.storefront_enabled && business.slug ? (
          <a
            href={storefrontShareUrl(business.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Open shop
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={isOffline || !dirty || updateProfile.isPending}
          loading={updateProfile.isPending}
          onClick={() => {
            updateProfile.mutate(
              {
                storefront_enabled: enabled,
                slug: slug.trim() || undefined,
              },
              {
                onSuccess: () => {
                  setDraft(null);
                  showToast('success', 'Shop settings saved');
                },
                onError: () => showToast('error', 'Could not save shop settings'),
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
