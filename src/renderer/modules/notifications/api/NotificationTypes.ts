export type NotificationChannel = 'email' | 'in_app' | 'both';

export type NotificationType =
  | 'business_status'
  | 'platform_message'
  | 'user_status'
  | 'pipeline.assignment'
  | 'pipeline.comment'
  | 'pipeline.announcement'
  | 'pipeline.poll'
  | 'pipeline.reminder'
  | 'pipeline.board_message';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  intention: string | null;
  channel: NotificationChannel;
  metadata: Record<string, unknown> | null;
  business_id: number | null;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

export interface PaginatedNotifications {
  data: AppNotification[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
