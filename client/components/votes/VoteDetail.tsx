'use client';

import { useState, useEffect } from 'react';
import { type VoteRow, type VotePositionRow, type UserCongressionalVote, type UserVotePosition } from '@/lib/api/congressionalVotes';
import { type Member } from '@/lib/api/members';
import { fetchBillDetail, type BillDetailResponse } from '@/lib/api/bills';
import BillDetail from '@/components/bills/BillDetail';

const CHAMBER_LABEL: Record<string, string> = { h: 'House', s: 'Senate' };

/** Converts "Last, First" → "First Last". Leaves other formats unchanged. */
function displayName(name: string): string {
  if (!name.includes(',')) return name;
  const [last, first] = name.split(', ');
  return `${first} ${last}`.trim();
}

/**
 * Finds the position label for a rep.
 *
 * House positions store bioguide IDs in legislator_id — matches directly.
 * Senate positions store LIS IDs (e.g. "S370") in legislator_id — bioguide
 * IDs won't match, so we fall back to last_name + state.
 */
function findPosition(
  rep: Member,
  positions: Record<string, VotePositionRow[]>
): string | null {
  const repLastName = rep.name.split(',')[0].trim();

  for (const [label, legislators] of Object.entries(positions)) {
    const found = legislators.some(
      (l) =>
        l.legislator_id === rep.api_id ||
        (l.last_name !== null &&
          l.party !== null &&
          l.last_name === repLastName &&
          rep.party.startsWith(l.party === 'D' ? 'Democrat' : l.party === 'R' ? 'Republican' : 'Independent'))
    );
    if (found) return label;
  }
  return null;
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface ViewMoreSectionProps {
  vote: VoteRow;
}

function ViewMoreSection({ vote }: ViewMoreSectionProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BillDetailResponse | null>(null);
  const [textVersions, setTextVersions] = useState<Parameters<typeof BillDetail>[0]['textVersions']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isTextError, setIsTextError] = useState(false);

  useEffect(() => {
    if (!vote.bill_congress || !vote.bill_type || !vote.bill_number) return;
    setIsLoading(true);
    setIsError(false);
    fetchBillDetail(vote.bill_congress, vote.bill_type, String(vote.bill_number))
      .then(setData)
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, [vote.bill_congress, vote.bill_type, vote.bill_number]);

  if (!vote.bill_congress || !vote.bill_type || !vote.bill_number) return null;

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  async function handleFetchText() {
    if (!vote.bill_congress || !vote.bill_type || !vote.bill_number) return;
    setIsTextLoading(true);
    setIsTextError(false);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/bill/${vote.bill_congress}/${vote.bill_type}/${vote.bill_number}/text`
      );
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setTextVersions(json.textVersions ?? []);
    } catch {
      setIsTextError(true);
    } finally {
      setIsTextLoading(false);
    }
  }

  const fallbackLabel = `${vote.bill_type.toUpperCase()} ${vote.bill_number} · ${vote.bill_congress}th Congress`;

  return (
    <section>
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <ChevronDownIcon open={open} />
        View More
      </button>

      {open && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          {isLoading && <p className="text-sm text-gray-400">Loading bill details…</p>}
          {isError && <p className="text-sm text-red-500">Failed to load bill details.</p>}
          {data && (
            <BillDetail
              bill={data.bill}
              actions={data.actions}
              summaries={data.summaries}
              textVersions={textVersions}
              isTextLoading={isTextLoading}
              isTextError={isTextError}
              onFetchText={handleFetchText}
              fallbackLabel={fallbackLabel}
            />
          )}
        </div>
      )}
    </section>
  );
}

interface VoteDetailProps {
  vote: VoteRow;
  positions: Record<string, VotePositionRow[]>;
  myReps?: Member[];
  userVote?: UserCongressionalVote | null;
  onVote?: (position: UserVotePosition) => Promise<void>;
  isVoting?: boolean;
}

function PositionSection({ label, legislators }: { label: string; legislators: VotePositionRow[] }) {
  if (legislators.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label} <span className="font-normal normal-case">({legislators.length})</span>
      </h3>
      <ul className="flex flex-wrap gap-1">
        {legislators.map((leg) => (
          <li
            key={leg.legislator_id}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
          >
            {leg.display_name ?? leg.legislator_id}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function VoteDetail({ vote, positions, myReps, userVote, onVote, isVoting }: VoteDetailProps) {
  const positionEntries = Object.entries(positions);
  const repPositions = myReps
  ?.map((rep) => ({ rep, position: findPosition(rep, positions) }))
  .filter(({ position }) => position !== null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
            {CHAMBER_LABEL[vote.chamber] ?? vote.chamber.toUpperCase()}
          </span>
          {vote.category && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {vote.category}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(vote.date).toLocaleString()}
          </span>
        </div>
        <h1 className="mt-2 text-lg font-semibold text-gray-900">{vote.question}</h1>
        {vote.subject && vote.subject !== vote.question && (
          <p className="mt-1 text-sm text-gray-500">{vote.subject}</p>
        )}
      </div>

      {/* Metadata grid */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Type', value: vote.type },
          { label: 'Result', value: vote.result_text ?? vote.result },
          { label: 'Requires', value: vote.requires },
          { label: 'Congress', value: vote.congress },
          { label: 'Session', value: vote.session },
          { label: 'Vote #', value: vote.number },
        ].map(({ label, value }) =>
          value != null ? (
            <div key={label} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{String(value)}</dd>
            </div>
          ) : null
        )}
      </dl>

      {/* Bill reference */}
      {vote.bill_type && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Bill</h2>
          <p className="text-sm text-gray-900">
            {vote.bill_type.toUpperCase()} {vote.bill_number}
            {vote.bill_title ? ` — ${vote.bill_title}` : ''}
          </p>
        </section>
      )}

      {/* Nomination reference */}
      {vote.nomination_title && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Nomination</h2>
          <p className="text-sm text-gray-900">{vote.nomination_title}</p>
        </section>
      )}

      {/* Amendment reference */}
      {vote.amendment_author && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">Amendment</h2>
          <p className="text-sm text-gray-900">
            #{vote.amendment_number} — {vote.amendment_author}
          </p>
        </section>
      )}

      {/* My reps' positions — shown instead of full positions when reps are saved */}
      {repPositions.length > 0 ? (
        <section className="flex flex-col gap-4">
        {/* View More — fetches bill details on demand (only for bill votes) */}
          <ViewMoreSection vote={vote} />
          <h1 className="text-lg font-semibold text-gray-900">Votes</h1>

          {/* User's own vote */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-700">
              My Vote
              {userVote && (
                <span className="ml-2 font-normal text-gray-500">— {userVote.position}</span>
              )}
            </h2>
            <div className="flex gap-2">
              {(['Yea', 'Nay', 'Abstain'] as UserVotePosition[]).map((pos) => {
                const isSelected = userVote?.position === pos;
                return (
                  <button
                    key={pos}
                    onClick={() => onVote?.(pos)}
                    disabled={isVoting}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? pos === 'Yea'
                          ? 'border-green-400 bg-green-100 text-green-800'
                          : pos === 'Nay'
                          ? 'border-red-400 bg-red-100 text-red-800'
                          : 'border-gray-400 bg-gray-200 text-gray-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Representatives' votes */}
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-gray-700">My Representatives</h2>
            <ul className="flex flex-col gap-1">
              {repPositions.map(({ rep, position }) => (
                <li key={rep.api_id} className="text-sm text-gray-900">
                  <span className="font-medium">{displayName(rep.name)}</span>
                  {': '}
                  <span>{position}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        positionEntries.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700">Positions</h2>
            {positionEntries.map(([label, legislators]) => (
              <PositionSection key={label} label={label} legislators={legislators} />
            ))}
          </section>
        )
      )}
    </div>
  );
}
