import { useState } from 'react';
import { AtSign, Globe, Link2, Link2Off, Plus, Trash2, WifiOff } from 'lucide-react';
import { Badge } from '../../../shared/components/badges/Badge';
import { Button } from '../../../shared/components/buttons/Button';
import { CustosellLoader } from '../../../shared/components/loading/CustosellLoader';
import { useAppSelector } from '../../../app/store/hooks/useApp';
import { selectIsCompletelyOffline } from '../../../app/store/slices/networkSlice';
import {
  useBusinessSocialLinks,
  useDeleteBusinessSocialLink,
  useUpsertBusinessSocialLink,
} from '../api/settings/BusinessQueries';
import type { BusinessSocialLink } from '../api/settings/BusinessTypes';
import { BusinessSectionCard, inputClass, selectClass, labelClass, iconClass } from './businessSettingsFormShared';
import { BrandIcon, hasBrandIcon } from '../../storefront/ui/brandIcons';
import { useConfirm } from '../../../shared/components/Feedback/ConfirmContext';

/** Standard platforms whose brand icons are configured - offered in the add-link select. */
const STANDARD_PLATFORMS = ['Facebook', 'Instagram', 'WhatsApp', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok'] as const;

const CUSTOM_OPTION = '__custom__';

function iconFor(platform: string): React.ReactNode {
  if (hasBrandIcon(platform)) {
    return <BrandIcon platform={platform} className="h-4 w-4" />;
  }
  return <Globe className="h-4 w-4" aria-hidden />;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Maps the add-link select value back to a platform the user actually enters.
 * The select either picks a standard platform or the "Custom…" sentinel, which
 * reveals a free-text platform input.
 */
function resolveChosenPlatform(selectValue: string, customValue: string): string {
  if (selectValue === CUSTOM_OPTION) return customValue;
  return selectValue;
}

export function BusinessSocialSection() {
  const { data: links = [], isLoading } = useBusinessSocialLinks();
  const upsert = useUpsertBusinessSocialLink();
  const remove = useDeleteBusinessSocialLink();
  const { confirm } = useConfirm();
  const isCompletelyOffline = useAppSelector(selectIsCompletelyOffline);

  const [platform, setPlatform] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPlatform, setEditPlatform] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const chosenPlatform = resolveChosenPlatform(platform, customPlatform);
  const isCustomChosen = platform === CUSTOM_OPTION;
  const canAdd = chosenPlatform.trim().length > 0 && url.trim().length > 0;
  const canSaveEdit = editPlatform.trim().length > 0 && editUrl.trim().length > 0;
  const isSaving = upsert.isPending;

  const handleAdd = () => {
    if (!canAdd || isCompletelyOffline || isSaving) return;
    upsert.mutate(
      { data: { platform: chosenPlatform.trim(), url: normalizeUrl(url) } },
      {
        onSuccess: () => {
          setPlatform('');
          setCustomPlatform('');
          setUrl('');
        },
      },
    );
  };

  const startEdit = (linkId: number, currentPlatform: string, currentUrl: string) => {
    setEditingId(linkId);
    setEditPlatform(currentPlatform);
    setEditUrl(currentUrl);
  };

  const saveEdit = (id: number) => {
    if (isCompletelyOffline || !canSaveEdit || isSaving) return;
    upsert.mutate(
      { id, data: { platform: editPlatform.trim(), url: normalizeUrl(editUrl) } },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleRemove = (link: BusinessSocialLink) => {
    if (isCompletelyOffline || remove.isPending) return;
    void confirm({
      title: 'Remove social link?',
      message: `This removes ${link.platform} from your storefront.`,
      confirmText: 'Remove',
      variant: 'danger',
    }).then((ok) => {
      if (ok) remove.mutate(link.id);
    });
  };

  return (
    <BusinessSectionCard
      icon={AtSign}
      title="Social links"
      description="Add your social media and web profiles - they appear on your public storefront."
    >
      {isCompletelyOffline && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Social links sync to the storefront and require an internet connection.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <CustosellLoader message="Loading social links…" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-sm text-gray-500">No social links yet. Add one below.</p>
      ) : (
        <ul className="mb-4 max-h-72 space-y-2 overflow-y-auto pr-1">
          {links.map((link) => {
            return (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-blue-600">
                    {iconFor(link.platform)}
                  </span>
                  <span className="min-w-0">
                    {editingId === link.id ? (
                      <span className="flex flex-wrap gap-2">
                        <input
                          className={`${inputClass} !py-1.5 sm:w-40`}
                          value={editPlatform}
                          onChange={(e) => setEditPlatform(e.target.value)}
                          placeholder="Platform"
                          aria-label={`Platform for ${link.platform}`}
                        />
                        <input
                          className={`${inputClass} !py-1.5 sm:min-w-[16rem]`}
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          placeholder="https://…"
                          aria-label={`URL for ${link.platform}`}
                        />
                      </span>
                    ) : (
                      <span>
                        <span className="block font-medium capitalize text-gray-900">{link.platform}</span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block max-w-full truncate text-blue-700 hover:underline"
                        >
                          {link.url}
                        </a>
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {editingId === link.id ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isCompletelyOffline || !canSaveEdit || isSaving}
                        loading={isSaving}
                        onClick={() => saveEdit(link.id)}
                      >
                        Save
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isCompletelyOffline || isSaving}
                        onClick={() => startEdit(link.id, link.platform, link.url)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isCompletelyOffline || isSaving || remove.isPending}
                        onClick={() => handleRemove(link)}
                        title={`Remove ${link.platform}`}
                        aria-label={`Remove ${link.platform}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 p-3">
        <p className={labelClass}>Add a link</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="sm:w-1/3">
            {isCustomChosen ? (
              <div className="relative">
                <input
                  className={`${inputClass} !pl-10`}
                  value={customPlatform}
                  onChange={(e) => setCustomPlatform(e.target.value)}
                  placeholder="Platform (e.g. Viber)"
                  disabled={isCompletelyOffline}
                  aria-label="Custom platform name"
                />
                <span className={iconClass}>
                  <Globe className="h-4 w-4" aria-hidden />
                </span>
              </div>
            ) : (
              <div className="relative">
                <span className={iconClass}>
                  <Globe className="h-4 w-4" aria-hidden />
                </span>
                <select
                  className={`${selectClass} !pl-10`}
                  value={platform}
                  onChange={(e) => {
                    setPlatform(e.target.value);
                    if (e.target.value !== CUSTOM_OPTION) setCustomPlatform('');
                  }}
                  disabled={isCompletelyOffline}
                  aria-label="Platform"
                >
                  <option value="" disabled>Select a platform…</option>
                  {STANDARD_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                  <option value={CUSTOM_OPTION}>Custom platform…</option>
                </select>
              </div>
            )}
          </div>
          <div className="relative sm:flex-1">
            <input
              className={`${inputClass} pl-9`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={isCompletelyOffline}
              aria-label="URL"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Link2 className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <div className="sm:w-auto">
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              disabled={isCompletelyOffline || !canAdd || isSaving}
              loading={isSaving && editingId === null}
              onClick={handleAdd}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Add link
            </Button>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Link2Off className="h-3.5 w-3.5" aria-hidden />
          Choose a standard platform or pick “Custom platform…” to enter your own. Adding the same platform again updates its URL.
        </p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Badge variant="neutral">Storefront</Badge>
        <span>These links appear on your public shop page.</span>
      </div>
    </BusinessSectionCard>
  );
}