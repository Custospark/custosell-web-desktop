import { Sparkles } from 'lucide-react';
import custosellLogo from '../../assets/custosell-logo.png';
import oscarAvatar from '../../assets/oscar.webp';

/** Brand mark with Oscar's photo peeking behind - the assistant, backed by a human team. */
export function AssistantLockup({ size }: { size: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-9 w-9';
  const logo = size === 'lg' ? 'h-9 w-9' : 'h-6 w-6';
  const photo = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${box}`} aria-hidden>
      <img
        src={oscarAvatar}
        alt=""
        className={`absolute left-0 top-0 ${photo} rounded-full object-cover ring-2 ring-white`}
      />
      <span className="absolute bottom-0 right-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-2 ring-white">
        <img src={custosellLogo} alt="" aria-hidden className={`${logo} rounded-full object-cover`} />
      </span>
    </span>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-indigo-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200">
      <Sparkles className="h-2.5 w-2.5" aria-hidden />
      AI
    </span>
  );
}
