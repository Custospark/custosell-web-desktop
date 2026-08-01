import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../../../app/api/axiosConfig';
import { USERS } from '../endpoints/endpoints';

interface UserLookupResult {
  status: string;
  user?: { id: number; name: string; email: string };
}

export function useUserLookup() {
  return useMutation<UserLookupResult, Error, { email: string }>({
    mutationFn: async ({ email }) => {
      const { data } = await axiosInstance.get<{ data: UserLookupResult }>(USERS.LOOKUP, { params: { email } });
      return data.data;
    },
  });
}
