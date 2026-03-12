import { useQuery } from '@tanstack/react-query';
import { fetchBills, type Bill } from '@/lib/api/bills';

interface UseBillsResult {
  bills: Bill[];
  isLoading: boolean;
  isError: boolean;
}

export function useBills(): UseBillsResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bills'],
    queryFn: fetchBills,
  });

  return {
    bills: data?.bills ?? [],
    isLoading,
    isError,
  };
}
