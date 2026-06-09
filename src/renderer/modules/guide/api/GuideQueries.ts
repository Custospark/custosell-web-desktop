import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { GUIDE } from '../../../shared/api/endpoints/guideEndpoints';
import type {
  GuideFaqDto,
  GuideFeedbackCategory,
  GuideFeedbackMineDto,
} from './GuideTypes';

export const guideKeys = {
  all: ['guide'] as const,
  tutorials: () => [...guideKeys.all, 'tutorials'] as const,
  faqs: () => [...guideKeys.all, 'faqs'] as const,
  feedbackMine: () => [...guideKeys.all, 'feedback-mine'] as const,
};

export function useGuideTutorials() {
  return useQuery({
    queryKey: guideKeys.tutorials(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: import('./GuideTypes').GuideTutorialDto[] }>(GUIDE.TUTORIALS);
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useGuideFaqs() {
  return useQuery({
    queryKey: guideKeys.faqs(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFaqDto[] }>(GUIDE.FAQS);
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useMyGuideFeedback() {
  return useQuery({
    queryKey: guideKeys.feedbackMine(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: GuideFeedbackMineDto[] }>(GUIDE.FEEDBACK_MINE);
      return data.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateGuideFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      category: GuideFeedbackCategory;
      subject: string;
      body: string;
    }) => {
      const { data } = await axiosInstance.post<{ data: GuideFeedbackMineDto; message?: string }>(
        GUIDE.FEEDBACK,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: guideKeys.feedbackMine() });
    },
  });
}
