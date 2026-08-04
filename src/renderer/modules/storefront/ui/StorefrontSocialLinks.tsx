import { Globe } from 'lucide-react';
import type { StorefrontSocialLink } from '../api/storefrontTypes';
import { cn } from '../../../shared/utils/cn';
import { BrandIcon } from './brandIcons';

const BRAND_COLORS: Record<string, string> = {
  facebook: 'text-[#1877F2]',
  youtube: 'text-[#FF0000]',
  instagram: 'text-[#E4405F]',
  twitter: 'text-[#1DA1F2]',
  linkedin: 'text-[#0A66C2]',
  whatsapp: 'text-[#25D366]',
  tiktok: 'text-slate-900',
};

export function StorefrontSocialLinks({
  links,
  className,
}: {
  links: StorefrontSocialLink[];
  className?: string;
}) {
  if (!links.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-x-3 gap-y-2', className)}>
      {links.map((link) => {
        const platformKey = link.platform.toLowerCase();
        const brandColor = BRAND_COLORS[platformKey];
        return (
          <a
            key={`${platformKey}-${link.url}`}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title={link.url}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline"
          >
            {brandColor ? (
              <BrandIcon platform={link.platform} className={cn('h-3.5 w-3.5 shrink-0', brandColor)} />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-hidden />
            )}
            <span className="capitalize">{link.platform}</span>
          </a>
        );
      })}
    </div>
  );
}