import {
  ArrowRightLeft,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  ThumbsDown,
  ThumbsUp,
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
  if (type === 'call') return 'Call logged';
  if (type === 'email') return 'Email logged';
  if (type === 'meeting') return 'Meeting logged';
  return type.replace(/_/g, ' ');
}

export function historyIconForActivity(activity: { type: string; metadata?: Record<string, unknown> | null }) {
  const action = activity.metadata?.action;
  if (action === 'reaction') {
    return activity.metadata?.reaction === 'dislike' ? ThumbsDown : ThumbsUp;
  }
  if (action === 'reaction_removed') return ThumbsUp;
  if (action === 'attachment_added' || action === 'attachment_removed') return CheckCircle2;
  return ACTIVITY_ICONS[activity.type] ?? CheckCircle2;
}
