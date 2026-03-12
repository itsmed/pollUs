import { useQuery } from '@tanstack/react-query';
import {
  fetchBills,
  fetchBillDetail,
  fetchBillText,
  type Bill,
  type BillDetailResponse,
  type TextVersion,
} from '@/lib/api/bills';

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

interface UseBillDetailResult {
  detail: BillDetailResponse | null;
  isLoading: boolean;
  isError: boolean;
}

export function useBillDetail(
  congress: number,
  type: string,
  number: string
): UseBillDetailResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bill', congress, type, number],
    queryFn: () => fetchBillDetail(congress, type, number),
  });

  return {
    detail: data ?? null,
    isLoading,
    isError,
  };
}

interface UseBillTextResult {
  textVersions: TextVersion[];
  isLoading: boolean;
  isError: boolean;
  fetch: () => void;
}

export function useBillText(
  congress: number,
  type: string,
  number: string
): UseBillTextResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bill-text', congress, type, number],
    queryFn: () => fetchBillText(congress, type, number),
    enabled: false,
  });

  return {
    textVersions: data?.textVersions ?? [],
    isLoading,
    isError,
    fetch: refetch,
  };
}
