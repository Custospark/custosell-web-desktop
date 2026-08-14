import { Mail, Monitor, Radio } from 'lucide-react';
import type { NotificationChannel } from '../../notifications/api/NotificationTypes';
import { cn } from '../../../shared/utils/cn';

export const NOTIFICATION_CHANNEL_OPTIONS: {
  value: NotificationChannel;
  label: string;
  description: string;
  icon: typeof Mail;
}[] = [
  {
    value: 'in_app',
    label: 'In the app',
    description: 'Shows in the bell icon and notifications page. No email.',
    icon: Monitor,
  },
  {
    value: 'email',
    label: 'By email',
    description: 'Sends one email to the business owner and team. Nothing in the app.',
    icon: Mail,
  },
  {
    value: 'both',
    label: 'App and email',
    description: 'One message in the app and one email - nothing duplicated on the same channel.',
    icon: Radio,
  },
];

export function NotificationChannelPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: NotificationChannel;
  onChange: (channel: NotificationChannel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">How should they receive this?</label>
      <div className="grid grid-cols-1 gap-2">
        {NOTIFICATION_CHANNEL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                selected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/30'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <div className={cn('p-1.5 rounded-md shrink-0', selected ? 'bg-blue-100' : 'bg-gray-100')}>
                <Icon className={cn('w-4 h-4', selected ? 'text-blue-600' : 'text-gray-500')} />
              </div>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium', selected ? 'text-blue-900' : 'text-gray-900')}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
