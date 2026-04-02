import { useQuery } from '@tanstack/react-query';
import { fetchMyReps, type MyRepsResponse } from '../api/user';

export function useMyReps(enabled: boolean): {
  data: MyRepsResponse | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['myReps'],
    queryFn: fetchMyReps,
    enabled,
    staleTime: Infinity,
  });
  return { data, isLoading };
}
