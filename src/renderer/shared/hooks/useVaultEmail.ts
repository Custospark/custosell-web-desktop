import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../app/api/axiosConfig';
import { useToast } from '../../app/contexts/useToast';
import { DOCUMENTS } from '../../modules/documents/api/documentEndpoints';
import { documentKeys } from '../../modules/documents/api/documentQueryKeys';

export interface SendDocumentEmailPayload {
  to?: string;
  message?: string;
}

export interface SendDocumentEmailResult {
  sent_to: string;
  sent_at: string;
  document_type: string;
  document_ref: string;
  email_sent_count: number;
  last_emailed_at?: string | null;
}

function extractErrorMessage(error: AxiosError): string {
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return 'Failed to send email';
}

async function postVaultEmail(url: string, payload: SendDocumentEmailPayload): Promise<SendDocumentEmailResult> {
  const body: SendDocumentEmailPayload = {};
  const to = payload.to?.trim();
  const message = payload.message?.trim();
  if (to) body.to = to;
  if (message) body.message = message;

  const { data } = await axiosInstance.post<SendDocumentEmailResult>(url, body);
  return data;
}

export function useEmailVaultFile() {
  const { showToast } = useToast();
  const qc = useQueryClient();

  return useMutation<SendDocumentEmailResult, AxiosError, { id: number; payload: SendDocumentEmailPayload }>({
    mutationFn: ({ id, payload }) => postVaultEmail(DOCUMENTS.EMAIL(id), payload),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: documentKeys.all });
      showToast('success', `File emailed to ${result.sent_to}`);
    },
    onError: (error) => showToast('error', extractErrorMessage(error)),
  });
}

export function useEmailVaultFolder() {
  const { showToast } = useToast();

  return useMutation<SendDocumentEmailResult, AxiosError, { id: number; payload: SendDocumentEmailPayload }>({
    mutationFn: ({ id, payload }) => postVaultEmail(DOCUMENTS.FOLDER_EMAIL(id), payload),
    onSuccess: (result) => {
      showToast('success', `Folder emailed to ${result.sent_to}`);
    },
    onError: (error) => showToast('error', extractErrorMessage(error)),
  });
}
