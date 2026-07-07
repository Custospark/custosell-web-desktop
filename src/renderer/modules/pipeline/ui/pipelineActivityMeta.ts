import {
  ArrowRightLeft,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Video,
} from 'lucide-react';
import type { PipelineActivityType } from '../api/pipelineTypes';

export const USER_COMMENT_TYPES = new Set<PipelineActivityType>([
  'note',
  'comment',
  'call',
  'email',
  'meeting',
]);

export const COMMENT_TYPES = [
  { value: 'comment' as const, label: 'Comment', icon: MessageSquare },
  { value: 'call' as const, label: 'Call', icon: Phone },
  { value: 'email' as const, label: 'Email', icon: Mail },
  { value: 'meeting' as const, label: 'Meeting', icon: Video },
];

export const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  comment: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Video,
  system: CheckCircle2,
  stage_change: ArrowRightLeft,
};

export function activityTypeLabel(type: string): string {
  if (type === 'comment' || type === 'note') return 'Comment';
  return type.replace('_', ' ');
}
