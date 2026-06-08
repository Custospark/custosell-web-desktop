export type GuideTutorialCategory = 'general' | 'getting-started' | 'sales' | 'inventory';

export interface GuideTutorialDto {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  thumbnail_upload_url: string | null;
  thumbnail_video_preview_url: string | null;
  banner_image_url: string | null;
  category: GuideTutorialCategory;
  sort_order: number;
  is_published: boolean;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GuideFaqDto {
  uuid: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface GuideFaqAdminDto extends GuideFaqDto {
  id: number;
  is_published: boolean;
  created_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export type GuideFeedbackCategory = 'feedback' | 'feature_request';

export type GuideFeedbackStatus =
  | 'submitted'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export interface GuideFeedbackMineDto {
  id: number;
  uuid: string;
  category: GuideFeedbackCategory;
  subject: string;
  body: string;
  status: GuideFeedbackStatus;
  staff_reply: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface GuideFeedbackAdminRowDto {
  id: number;
  uuid: string;
  user_id: number;
  user_display: string;
  user_email: string | null;
  business_id: number | null;
  business_name: string | null;
  category: GuideFeedbackCategory;
  subject: string;
  status: GuideFeedbackStatus;
  created_at: string | null;
}

export interface GuideFeedbackAdminDetailDto extends GuideFeedbackAdminRowDto {
  body: string;
  staff_reply: string | null;
  admin_internal_notes: string | null;
  updated_at: string | null;
}

export interface GuideTutorialPayload {
  title: string;
  description?: string | null;
  video_url: string;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
  banner_image_url?: string | null;
  category: GuideTutorialCategory;
  sort_order?: number;
  is_published?: boolean;
}

export interface GuideFaqPayload {
  question: string;
  answer: string;
  sort_order?: number;
  is_published?: boolean;
}

export const GUIDE_TUTORIAL_CATEGORIES: { value: GuideTutorialCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'getting-started', label: 'Getting started' },
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
];
