import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { USERS } from '../endpoints/endpoints';

export function useUserLookup() {
  return useMutation<{
    data: { status: string; user?: { id: number; name: string; email: string } };
  }, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const { data } = await axiosInstance.get(USERS.LOOKUP, { params: { email } });
      return data;
    },
  });
}
