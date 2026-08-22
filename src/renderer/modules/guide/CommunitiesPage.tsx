import { Users, MessageCircle, Send, MessageSquare, Link2, AtSign, Hash, ExternalLink } from 'lucide-react';
import { useGuideCommunities } from './api/GuideQueries';
import type { GuideCommunityDto } from './api/GuideTypes';
import { CustosellLoader } from '../../shared/components/loading/CustosellLoader';
import { BrandIcon, hasBrandIcon } from '../../modules/storefront/ui/brandIcons';

const platformMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  whatsapp: { label: 'WhatsApp', color: 'bg-green-500', icon: MessageCircle },
  telegram: { label: 'Telegram', color: 'bg-sky-500', icon: Send },
  discord: { label: 'Discord', color: 'bg-indigo-500', icon: MessageSquare },
  facebook: { label: 'Facebook', color: 'bg-blue-600', icon: Users },
  x: { label: 'X (Twitter)', color: 'bg-slate-900', icon: AtSign },
  instagram: { label: 'Instagram', color: 'bg-pink-600', icon: MessageCircle },
  youtube: { label: 'YouTube', color: 'bg-red-600', icon: MessageSquare },
  tiktok: { label: 'TikTok', color: 'bg-slate-900', icon: AtSign },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-700', icon: Link2 },
  slack: { label: 'Slack', color: 'bg-fuchsia-600', icon: Hash },
  other: { label: 'Community', color: 'bg-gray-600', icon: Users },
};

/** Render the platform's brand glyph when known, else the fallback lucide icon. */
function PlatformGlyph({ platform, className }: { platform: string; className?: string }) {
  if (hasBrandIcon(platform)) {
    return <BrandIcon platform={platform} className={className} />;
  }
  const meta = platformMeta[platform] ?? platformMeta.other;
  const Icon = meta.icon;
  return <Icon className={className} aria-hidden />;
}

/**
 * Company-wide Custosell communities that any signed-in user can join
 * (WhatsApp, Telegram, Discord, etc.). Auth-only - rendered inside the
 * Guide module which is behind `auth:sanctum`.
 */
export function CommunitiesSection({ communities }: { communities: GuideCommunityDto[] }) {
  if (communities.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        No communities are open right now. Check back soon.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {communities.map((community) => {
        const meta = platformMeta[community.platform] ?? platformMeta.other;
        return (
          <a
            key={community.uuid}
            href={community.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color} text-white shadow-sm`}>
              <PlatformGlyph platform={community.platform} className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                {community.name}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden />
              </p>
              {community.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{community.description}</p>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {meta.label} · Join
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function CommunitiesPage() {
  const { data: communities = [], isLoading } = useGuideCommunities();

  return (
    <div className="space-y-6">
<div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Users className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Custosell Communities</p>
          <h1 className="text-2xl font-bold text-gray-900">Join the community</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Connect with other Custosell users and the team - share tips, ask questions, and stay up to
            date on what&apos;s new.
          </p>
        </div>
      </div>

      {isLoading ? (
        <CustosellLoader message="Loading communities..." />
      ) : (
        <CommunitiesSection communities={communities} />
      )}
    </div>
  );
}