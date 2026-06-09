import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { PLATFORM } from '../../../shared/api/endpoints/platformEndpoints';
import type {
  GuideFaqAdminDto,
  GuideFaqPayload,
  GuideFeedbackAdminDetailDto,
  GuideFeedbackAdminRowDto,
  GuideFeedbackStatus,
  GuideTutorialDto,
  GuideTutorialPayload,
} from '../../guide/api/GuideTypes';

export const platformGuideKeys = {
  all: ['platform-guide'] as const,
  tutorials: (params?: Record<string, string>) => [...platformGuideKeys.all, 'tutorials', params ?? {}] as const,
  faqs: (params?: Record<string, string>) => [...platformGuideKeys.all, 'faqs', params ?? {}] as const,
  feedback: (params?: Record<string, string>) => [...platformGuideKeys.all, 'feedback', params ?? {}] as const,
  feedbackDetail: (id: number | null) => [...platformGuideKeys.all, 'feedback-detail', id] as const,
};

export function usePlatformGuideTutorials(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformGuideKeys.tutorials(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideTutorialDto[] }>(PLATFORM.GUIDE.TUTORIALS, { params });
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreatePlatformGuideTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GuideTutorialPayload) => {
      const { data } = await axiosInstance.post<{ data: GuideTutorialDto; message?: string }>(
        PLATFORM.GUIDE.TUTORIALS,
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useUpdatePlatformGuideTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<GuideTutorialPayload> }) => {
      const { data } = await axiosInstance.put<{ data: GuideTutorialDto; message?: string }>(
        PLATFORM.GUIDE.TUTORIAL(id),
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useDeletePlatformGuideTutorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PLATFORM.GUIDE.TUTORIAL(id));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function usePreviewGuideTutorialThumbnail() {
  return useMutation({
    mutationFn: async (payload: { video_url: string }) => {
      const { data } = await axiosInstance.post<{ data: { thumbnail_url: string | null }; message?: string }>(
        PLATFORM.GUIDE.TUTORIALS_PREVIEW_THUMB,
        payload,
      );
      return data;
    },
  });
}

export function useUploadGuideTutorialThumbnail() {
  return useMutation({
    mutationFn: async (args: {
      file: File;
      tutorialId?: number;
      previousThumbnailPath?: string;
    }) => {
      const form = new FormData();
      form.append('photo', args.file);
      if (args.previousThumbnailPath) {
        form.append('previous_thumbnail_path', args.previousThumbnailPath);
      }
      const url = args.tutorialId
        ? PLATFORM.GUIDE.TUTORIAL_UPLOAD_THUMB(args.tutorialId)
        : PLATFORM.GUIDE.TUTORIALS_UPLOAD_PENDING;
      const { data } = await axiosInstance.post<{
        data: { thumbnail_path: string; thumbnail_url: string };
        message?: string;
      }>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return data;
    },
  });
}

export function usePlatformGuideFaqs(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: platformGuideKeys.faqs(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFaqAdminDto[] }>(PLATFORM.GUIDE.FAQS, { params });
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreatePlatformGuideFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GuideFaqPayload) => {
      const { data } = await axiosInstance.post<{ data: GuideFaqAdminDto; message?: string }>(
        PLATFORM.GUIDE.FAQS,
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useUpdatePlatformGuideFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<GuideFaqPayload> }) => {
      const { data } = await axiosInstance.put<{ data: GuideFaqAdminDto; message?: string }>(
        PLATFORM.GUIDE.FAQ(id),
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useDeletePlatformGuideFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PLATFORM.GUIDE.FAQ(id));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function usePlatformGuideFeedbackList(params: Record<string, string | undefined> = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== '') as [string, string][],
  );
  return useQuery({
    queryKey: platformGuideKeys.feedback(cleanParams),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFeedbackAdminRowDto[] }>(PLATFORM.GUIDE.FEEDBACK, {
        params: cleanParams,
      });
      return data.data;
    },
    staleTime: 15_000,
  });
}

export function usePlatformGuideFeedbackDetail(id: number | null) {
  return useQuery({
    queryKey: platformGuideKeys.feedbackDetail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFeedbackAdminDetailDto }>(
        PLATFORM.GUIDE.FEEDBACK_ITEM(id!),
      );
      return data.data;
    },
    enabled: id != null,
  });
}

export function useUpdatePlatformGuideFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        status?: GuideFeedbackStatus;
        staff_reply?: string | null;
        admin_internal_notes?: string | null;
      };
    }) => {
      const { data } = await axiosInstance.patch<{ data: GuideFeedbackAdminDetailDto; message?: string }>(
        PLATFORM.GUIDE.FEEDBACK_ITEM(id),
        payload,
      );
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useDeletePlatformGuideFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await axiosInstance.delete(PLATFORM.GUIDE.FEEDBACK_ITEM(id));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useBulkDeletePlatformGuideFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 1) {
        await axiosInstance.delete(PLATFORM.GUIDE.FEEDBACK_ITEM(ids[0]));
        return;
      }
      await axiosInstance.post(PLATFORM.GUIDE.FEEDBACK_BULK_DELETE, { ids });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}

export function useBulkUpdatePlatformGuideFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: GuideFeedbackStatus }) => {
      await Promise.all(
        ids.map((id) =>
          axiosInstance.patch(PLATFORM.GUIDE.FEEDBACK_ITEM(id), { status }),
        ),
      );
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: platformGuideKeys.all }),
  });
}
