import { useQuery } from '@tanstack/react-query';
import {
  fetchVotes,
  fetchVoteDetail,
  type VotesListResponse,
  type VoteDetailResponse,
} from '@/lib/api/congressionalVotes';

interface UseVotesResult {
  data: VotesListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useVotes(
  params: { limit?: number; offset?: number; chamber?: 'h' | 's' } = {}
): UseVotesResult {
  const { limit, offset, chamber } = params;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['votes', { limit, offset, chamber }],
    queryFn: () => fetchVotes({ limit, offset, chamber }),
  });

  return { data, isLoading, isError };
}

interface UseVoteDetailResult {
  data: VoteDetailResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useVoteDetail(voteId: string, chamber?: 'h' | 's'): UseVoteDetailResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['vote', voteId, chamber],
    queryFn: () => fetchVoteDetail(voteId, chamber),
  });

  return { data, isLoading, isError };
}
