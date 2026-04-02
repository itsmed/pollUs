import { useQuery } from '@tanstack/react-query';
import {
  fetchMembers,
  fetchMemberDetail,
  fetchMemberAgreement,
  fetchMemberSharedVotes,
  type Member,
  type MemberDetail,
  type AgreementResponse,
  type SharedVote,
} from '../api/members';

export interface UseMembersResult {
  senators: Member[];
  representatives: Member[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useMembers(): UseMembersResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  });

  const senators = data?.members.filter((m) => m.role === 'Senator') ?? [];
  const representatives = data?.members.filter((m) => m.role === 'Representative') ?? [];

  return { senators, representatives, isLoading, isError, error: error as Error | null };
}

interface UseMemberDetailResult {
  member: MemberDetail | null;
  isLoading: boolean;
  isError: boolean;
}

export function useMemberDetail(bioguideId: string): UseMemberDetailResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['member', bioguideId],
    queryFn: () => fetchMemberDetail(bioguideId),
  });

  return { member: data?.member ?? null, isLoading, isError };
}

interface UseMemberAgreementResult {
  agreement: AgreementResponse | null;
  isLoading: boolean;
}

export function useMemberAgreement(bioguideId: string, enabled: boolean): UseMemberAgreementResult {
  const { data, isLoading } = useQuery({
    queryKey: ['member-agreement', bioguideId],
    queryFn: () => fetchMemberAgreement(bioguideId),
    enabled,
  });

  return { agreement: data ?? null, isLoading };
}

interface UseMemberSharedVotesResult {
  votes: SharedVote[];
  isLoading: boolean;
  isError: boolean;
}

export function useMemberSharedVotes(bioguideId: string, enabled: boolean): UseMemberSharedVotesResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['member-shared-votes', bioguideId],
    queryFn: () => fetchMemberSharedVotes(bioguideId),
    enabled,
  });

  return { votes: data?.votes ?? [], isLoading, isError };
}
