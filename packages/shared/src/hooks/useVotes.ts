import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchVotes,
  fetchVoteDetail,
  fetchUserCongressionalVote,
  castUserCongressionalVote,
  type VotesListResponse,
  type VoteDetailResponse,
  type UserCongressionalVote,
  type UserVotePosition,
} from '../api/congressionalVotes';

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

interface UseUserCongressionalVoteResult {
  userVote: UserCongressionalVote | null;
  isLoading: boolean;
  cast: (position: UserVotePosition) => Promise<void>;
  isCasting: boolean;
}

export function useUserCongressionalVote(voteId: string): UseUserCongressionalVoteResult {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['user-congressional-vote', voteId],
    queryFn: () => fetchUserCongressionalVote(voteId),
  });

  const mutation = useMutation({
    mutationFn: (position: UserVotePosition) => castUserCongressionalVote(voteId, position),
    onSuccess: (result) => {
      queryClient.setQueryData(['user-congressional-vote', voteId], result);
    },
  });

  return {
    userVote: data?.vote ?? null,
    isLoading,
    cast: async (position) => { await mutation.mutateAsync(position); },
    isCasting: mutation.isPending,
  };
}
