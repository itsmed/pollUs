import { getApiUrl } from '../config';

export interface Member {
  id: number;
  name: string;
  state: string;
  district: string | null;
  role: 'Senator' | 'Representative';
  party: string;
  api_id: string;
  photo_url: string | null;
}

export interface MembersResponse {
  source: 'cache' | 'api';
  count: number;
  members: Member[];
}

export interface MemberTerm {
  chamber: string;
  congress: number;
  startYear: number;
  endYear: number | null;
  memberType: string;
  stateName: string;
}

export interface MemberPartyHistory {
  partyName: string;
  partyAbbreviation: string;
  startYear: number;
}

export interface MemberDetail {
  bioguideId: string;
  name: string;
  state: string;
  district: number | null;
  currentMember: boolean;
  birthYear: string | null;
  honorificName: string | null;
  officialWebsiteUrl: string | null;
  depiction: { imageUrl: string; attribution: string | null } | null;
  partyHistory: MemberPartyHistory[];
  terms: MemberTerm[];
  sponsoredLegislation: { count: number; url: string };
  cosponsoredLegislation: { count: number; url: string };
}

export interface MemberDetailResponse {
  member: MemberDetail;
}

export interface AgreementResponse {
  agree: number;
  total: number;
  percentage: number | null;
}

export interface SharedVote {
  vote_id: string;
  question: string;
  date: string;
  category: string | null;
  user_position: string;
  member_position: string;
  agreed: boolean;
}

export interface SharedVotesResponse {
  votes: SharedVote[];
}

export async function fetchMemberSharedVotes(bioguideId: string): Promise<SharedVotesResponse> {
  const res = await fetch(`${getApiUrl()}/api/member/${bioguideId}/shared-votes`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch shared votes: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMemberAgreement(bioguideId: string): Promise<AgreementResponse> {
  const res = await fetch(`${getApiUrl()}/api/member/${bioguideId}/agreement`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch agreement: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMemberDetail(bioguideId: string): Promise<MemberDetailResponse> {
  const res = await fetch(`${getApiUrl()}/api/member/${bioguideId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch member detail: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchMembers(): Promise<MembersResponse> {
  const res = await fetch(`${getApiUrl()}/api/member`);
  if (!res.ok) {
    throw new Error(`Failed to fetch members: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
