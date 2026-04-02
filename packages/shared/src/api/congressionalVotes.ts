/**
 * TypeScript types for congressional vote records sourced from
 * the govinfo.gov / unitedstates/congress-legislators data set.
 *
 * Top-level vote structure (data.json per roll-call vote):
 *   - `bill`        present for bill/resolution votes
 *   - `nomination`  present for nomination confirmation votes
 *   - `amendment`   present for amendment votes (may coexist with `bill`)
 *   - neither       for pure procedural votes (adjourn, speaker election, …)
 *
 * The discriminated union `CongressionalVote` covers all four variants.
 */

import { getApiUrl } from '../config';

// ─── Bill types ───────────────────────────────────────────────────────────────

/** Bill classification codes as they appear in `bill.type`. */
export type BillType =
  | 'hr'       // House bill (H.R.)
  | 'hres'     // House simple resolution (H.Res.)
  | 'hjres'    // House joint resolution (H.J.Res.)
  | 'hconres'  // House concurrent resolution (H.Con.Res.)
  | 's'        // Senate bill (S.)
  | 'sres'     // Senate simple resolution (S.Res.)
  | 'sjres'    // Senate joint resolution (S.J.Res.)
  | 'sconres'; // Senate concurrent resolution (S.Con.Res.)

/** Broad action categories used to group vote types. */
export type VoteCategory =
  | 'passage'
  | 'passage-suspension'
  | 'procedural'
  | 'cloture'
  | 'amendment'
  | 'nomination'
  | 'quorum'
  | 'leadership'
  | 'other';

// ─── Subject references ───────────────────────────────────────────────────────

/** Reference to the bill or resolution being voted on. */
export interface BillRef {
  congress: number;
  number: number;
  type: BillType;
  /** Present in Senate votes and some House votes. */
  title?: string;
}

/** Reference to a presidential nomination being confirmed. */
export interface NominationRef {
  /** Nomination number, e.g. "26-50". */
  number: string;
  title: string;
}

/** Reference to an amendment being considered. */
export interface AmendmentRef {
  number: number;
  /** Source chamber classification, e.g. "h-bill". */
  type: string;
  author: string;
}

// ─── Legislators ──────────────────────────────────────────────────────────────

/** House member record — 4 fields, id is a bioguide ID (e.g. "A000370"). */
export interface HouseLegislator {
  id: string;
  display_name: string;
  party: 'D' | 'R' | 'I';
  state: string;
}

/** Senate member record — 6 fields, id is a senate ID (e.g. "S429"). */
export interface SenateLegislator {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  party: 'D' | 'R' | 'I';
  state: string;
}

export type Legislator = HouseLegislator | SenateLegislator;

/**
 * Type guard: returns true when the legislator record has Senate-specific
 * first_name / last_name fields.
 */
export const isSenateLegislator = (l: Legislator): l is SenateLegislator =>
  'first_name' in l;

// ─── Vote positions ───────────────────────────────────────────────────────────

/**
 * Maps position labels to lists of legislators who cast that position.
 *
 * Standard keys: "Yea" | "Nay" | "Present" | "Not Voting"
 * Amendment keys: "Aye" | "No" | "Present" | "Not Voting"
 * Speaker election: candidate display names + "Present" | "Not Voting"
 */
export type VotePositions = Record<string, Legislator[]>;

// ─── Core vote record ─────────────────────────────────────────────────────────

interface CongressionalVoteBase {
  /** Unique identifier, e.g. "h75-119.2025". */
  vote_id: string;
  chamber: 'h' | 's';
  congress: number;
  session: string;
  number: number;
  /** ISO 8601 timestamp. */
  date: string;
  /** Specific parliamentary action, e.g. "On Passage of the Bill". */
  type: string;
  category: VoteCategory;
  question: string;
  subject?: string;
  /** Threshold required, e.g. "1/2", "3/5", "QUORUM". */
  requires: string;
  result: string;
  result_text: string;
  source_url: string;
  updated_at: string;
  /** Senate only — when the record was last modified. */
  record_modified?: string;
  votes: VotePositions;
}

// ─── Discriminated union by subject type ─────────────────────────────────────

/** Vote on a House or Senate bill / resolution. */
export interface BillVote extends CongressionalVoteBase {
  bill: BillRef;
  nomination?: never;
}

/** Vote on a presidential nomination (Senate only). */
export interface NominationVote extends CongressionalVoteBase {
  nomination: NominationRef;
  bill?: never;
  amendment?: never;
}

/**
 * Vote on an amendment to a bill. The parent `bill` reference is present;
 * `amendment` describes the specific amendment being considered.
 */
export interface AmendmentVote extends CongressionalVoteBase {
  bill: BillRef;
  amendment: AmendmentRef;
  nomination?: never;
}

/**
 * Pure procedural vote — no bill, nomination, or amendment reference.
 * Includes adjournment, speaker elections, quorum calls, etc.
 */
export interface ProceduralVote extends CongressionalVoteBase {
  bill?: never;
  nomination?: never;
  amendment?: never;
}

export type CongressionalVote =
  | BillVote
  | NominationVote
  | AmendmentVote
  | ProceduralVote;

// ─── Type guards ──────────────────────────────────────────────────────────────

export const isBillVote = (v: CongressionalVote): v is BillVote =>
  'bill' in v && v.bill != null && !('amendment' in v && v.amendment != null);

export const isAmendmentVote = (v: CongressionalVote): v is AmendmentVote =>
  'amendment' in v && v.amendment != null;

export const isNominationVote = (v: CongressionalVote): v is NominationVote =>
  'nomination' in v && v.nomination != null;

export const isProceduralVote = (v: CongressionalVote): v is ProceduralVote =>
  !('bill' in v && v.bill != null) &&
  !('nomination' in v && v.nomination != null) &&
  !('amendment' in v && v.amendment != null);

// ─── Bill-type-specific vote aliases ─────────────────────────────────────────
// Useful when you already know the bill.type and want a narrower type.

type BillVoteOf<T extends BillType> = Omit<BillVote, 'bill'> & {
  bill: BillRef & { type: T };
};

/** Vote on a House bill (H.R.). */
export type HRVote = BillVoteOf<'hr'>;

/** Vote on a House simple resolution (H.Res.). */
export type HResVote = BillVoteOf<'hres'>;

/** Vote on a House joint resolution (H.J.Res.). */
export type HJResVote = BillVoteOf<'hjres'>;

/** Vote on a House concurrent resolution (H.Con.Res.). */
export type HConResVote = BillVoteOf<'hconres'>;

/** Vote on a Senate bill (S.). */
export type SVote = BillVoteOf<'s'>;

/** Vote on a Senate simple resolution (S.Res.). */
export type SResVote = BillVoteOf<'sres'>;

/** Vote on a Senate joint resolution (S.J.Res.). */
export type SJResVote = BillVoteOf<'sjres'>;

/** Vote on a Senate concurrent resolution (S.Con.Res.). */
export type SConResVote = BillVoteOf<'sconres'>;

// ─── DB row shape (returned by /api/votes) ────────────────────────────────────
// Columns are snake_case; bill/nomination/amendment fields are flat (nullable).

export interface VoteRow {
  id: number;
  vote_id: string;
  chamber: 'h' | 's';
  congress: number;
  session: string;
  number: number;
  date: string;
  updated_at: string | null;
  record_modified: string | null;
  type: string;
  category: string | null;
  question: string;
  subject: string | null;
  requires: string | null;
  result: string | null;
  result_text: string | null;
  source_url: string | null;
  // Bill columns (nullable)
  bill_congress: number | null;
  bill_number: number | null;
  bill_type: BillType | null;
  bill_title: string | null;
  // Nomination columns (nullable)
  nomination_number: string | null;
  nomination_title: string | null;
  // Amendment columns (nullable)
  amendment_number: number | null;
  amendment_type: string | null;
  amendment_author: string | null;
}

export interface VotePositionRow {
  legislator_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  party: 'D' | 'R' | 'I' | null;
  state: string | null;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface VotesListResponse {
  total: number;
  limit: number;
  offset: number;
  chamber: 'h' | 's' | null;
  votes: VoteRow[];
}

export interface VoteDetailResponse {
  vote: VoteRow;
  positions: Record<string, VotePositionRow[]>;
  prev_vote_id: string | null;
  next_vote_id: string | null;
}

// ─── User congressional vote ──────────────────────────────────────────────────

export type UserVotePosition = 'Yea' | 'Nay' | 'Abstain';

export interface UserCongressionalVote {
  id: number;
  user_id: number;
  congressional_vote_id: number;
  position: UserVotePosition;
  created_at: string;
  updated_at: string;
}

export interface UserCongressionalVoteResponse {
  vote: UserCongressionalVote | null;
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchVotes(
  params: { limit?: number; offset?: number; chamber?: 'h' | 's' } = {}
): Promise<VotesListResponse> {
  const query = new URLSearchParams();
  if (params.limit   != null) query.set('limit',   String(params.limit));
  if (params.offset  != null) query.set('offset',  String(params.offset));
  if (params.chamber != null) query.set('chamber', params.chamber);
  const qs = query.toString();
  const res = await fetch(`${getApiUrl()}/api/votes${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch votes: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchVoteDetail(
  voteId: string,
  chamber?: 'h' | 's'
): Promise<VoteDetailResponse> {
  const qs = chamber ? `?chamber=${chamber}` : '';
  const res = await fetch(`${getApiUrl()}/api/votes/${encodeURIComponent(voteId)}${qs}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch vote detail: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchUserCongressionalVote(
  voteId: string
): Promise<UserCongressionalVoteResponse> {
  const res = await fetch(
    `${getApiUrl()}/api/votes/${encodeURIComponent(voteId)}/user-vote`,
    { credentials: 'include' }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch user vote: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function castUserCongressionalVote(
  voteId: string,
  position: UserVotePosition
): Promise<UserCongressionalVoteResponse> {
  const res = await fetch(
    `${getApiUrl()}/api/votes/${encodeURIComponent(voteId)}/user-vote`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to cast user vote: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
