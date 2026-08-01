import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { API_BASE_URL } from '../../../app/api/apiConfig';
import { useToast } from '../../../app/contexts/useToast';
import { sanitizeErrorMessage } from '../../../app/store/offline/core/offlineQueryUtils';
import type { PipelineLead, PipelineLeadMeeting } from './pipelineTypes';

const BOOKING_BASE = '/public/book';

export const bookingKeys = {
  info: (token: string) => ['public-booking', 'info', token] as const,
  slots: (token: string, date: string) => ['public-booking', 'slots', token, date] as const,
  settings: (boardId: number) => ['booking-settings', boardId] as const,
  check: (token: string, reference: string) => ['public-booking', 'check', token, reference] as const,
};

async function publicFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? 'Request failed');
  return body;
}

export function useBookingInfo(token: string) {
  return useQuery({
    queryKey: bookingKeys.info(token),
    queryFn: () => publicFetch<{ data: BookingInfo }>(`${BOOKING_BASE}/${token}`).then((r) => r.data),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
  });
}

export interface TimeSlot {
  time: string;
  end_time: string;
  available: boolean;
}

export function useBookingSlots(token: string, date: string) {
  return useQuery({
    queryKey: bookingKeys.slots(token, date),
    queryFn: () => publicFetch<{ data: { slots: TimeSlot[] } }>(`${BOOKING_BASE}/${token}/slots?date=${date}`).then((r) => r.data),
    enabled: Boolean(token) && Boolean(date),
    staleTime: 1000 * 30,
  });
}

export function useCreateBooking(token: string) {
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const res = await fetch(`${API_BASE_URL}${BOOKING_BASE}/${token}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Booking failed');
      return body;
    },
  });
}

export function useBookingSettings(boardId: number) {
  return useQuery<BookingSettings>({
    queryKey: bookingKeys.settings(boardId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ data: BookingSettings }>(
        `/pipeline/boards/${boardId}/booking-settings`,
      );
      return data.data;
    },
    enabled: Boolean(boardId),
  });
}

export function useUpdateBookingSettings(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: Partial<BookingSettingsPayload>) => {
      const { data } = await axiosInstance.put(
        `/pipeline/boards/${boardId}/booking-settings`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.settings(boardId) });
      showToast('success', 'Booking settings saved');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not save booking settings'));
    },
  });
}

export function useRegenerateBookingToken(boardId: number) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(
        `/pipeline/boards/${boardId}/booking-settings/regenerate-token`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.settings(boardId) });
      showToast('success', 'Booking link regenerated');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not regenerate token'));
    },
  });
}

export interface BookingInfo {
  board_name: string;
  business_name: string;
  logo_path?: string | null;
  available_days: number[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_slots_per_day: number;
  meeting_title_prefix: string | null;
  meeting_link: string | null;
}

export interface CreateBookingPayload {
  date: string;
  time: string;
  name: string;
  email?: string;
  phone?: string;
  meeting_link?: string;
  notes?: string;
}

export interface BookingSettings {
  id?: number;
  board_id: number;
  enabled: boolean;
  token: string;
  booking_url: string;
  available_days: number[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_duration: number;
  max_slots_per_day: number;
  meeting_title_prefix: string | null;
  meeting_link: string | null;
  target_stage_id: number | null;
}

export function useApproveBooking() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { leadId: number; meeting_link?: string; notes?: string }) => {
      const { leadId, ...body } = payload;
      const { data } = await axiosInstance.post<{ data: PipelineLead }>(`/pipeline/leads/${leadId}/approve-booking`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Booking approved');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not approve booking'));
    },
  });
}

export function useScheduleMeeting() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { leadId: number; start_date?: string; due_date?: string; meeting_link?: string; notes?: string }) => {
      const { leadId, ...data } = payload;
      const res = await axiosInstance.post<{ data: PipelineLeadMeeting }>(`/pipeline/leads/${leadId}/schedule-meeting`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Meeting scheduled');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not schedule meeting'));
    },
  });
}

export function useCompleteBooking() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (leadId: number) => {
      const { data } = await axiosInstance.post<{ data: PipelineLead }>(`/pipeline/leads/${leadId}/complete-booking`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Booking marked completed');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not complete booking'));
    },
  });
}

export function useRejectBooking() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({ leadId, reason }: { leadId: number; reason: string }) => {
      const { data } = await axiosInstance.post<{ data: PipelineLead }>(`/pipeline/leads/${leadId}/reject-booking`, { reason });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Booking rejected');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not reject booking'));
    },
  });
}

export interface BookingCheckInfo {
  business_name: string;
  board_name: string;
  logo_path?: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_city: string | null;
  business_state: string | null;
  business_postal_code: string | null;
  business_country: string | null;
  reference_code: string;
  booking_status: string;
  rejection_reason: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  start_date: string | null;
  end_date: string | null;
  meeting_link: string | null;
  notes: string | null;
  approved_at: string | null;
  rejected_at: string | null;
}

export function useCheckBooking(token: string, reference: string) {
  return useQuery({
    queryKey: bookingKeys.check(token, reference),
    queryFn: () => publicFetch<{ data: BookingCheckInfo }>(`${BOOKING_BASE}/${token}/check/${reference}`).then((r) => r.data),
    enabled: Boolean(token) && Boolean(reference),
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { leadId: number; start_date?: string; due_date?: string; meeting_link?: string; notes?: string }) => {
      const { leadId, ...data } = payload;
      const res = await axiosInstance.post<{ data: PipelineLeadMeeting }>(`/pipeline/leads/${leadId}/schedule-meeting`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Meeting scheduled');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not schedule meeting'));
    },
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (payload: { meetingId: number; start_date?: string; due_date?: string; meeting_link?: string; notes?: string }) => {
      const { meetingId, ...data } = payload;
      const res = await axiosInstance.patch<{ data: PipelineLeadMeeting }>(`/pipeline/meetings/${meetingId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Meeting updated');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not update meeting'));
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (meetingId: number) => {
      await axiosInstance.delete(`/pipeline/meetings/${meetingId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Meeting deleted');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not delete meeting'));
    },
  });
}

export function useClearBooking() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (leadId: number) => {
      await axiosInstance.post(`/pipeline/leads/${leadId}/clear-booking`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      showToast('success', 'Booking cleared');
    },
    onError: (err) => {
      showToast('error', sanitizeErrorMessage(err, 'Could not clear booking'));
    },
  });
}

export interface BookingSettingsPayload {
  enabled: boolean;
  available_days: number[];
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_duration: number;
  max_slots_per_day: number;
  meeting_title_prefix: string;
  meeting_link?: string;
  target_stage_id?: number;
}
