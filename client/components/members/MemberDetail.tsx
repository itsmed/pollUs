import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  type MemberDetail,
  type AgreementResponse,
  useMemberSharedVotes,
  partyBadge,
  badge,
  card,
  textPrimary,
  textSecondary,
  textMuted,
  textFaint,
  textLink,
  borderBase,
  borderSubtle,
  divideBase,
  hoverSurfaceSubtle,
  hoverTextPrimary,
  feedback,
} from '@pollus/shared';

interface MemberDetailProps {
  member: MemberDetail;
  agreement?: AgreementResponse | null;
}

/**
 * SVG donut pie chart showing agree/disagree split.
 * Uses the r≈15.9 trick so circumference ≈ 100, making strokeDasharray
 * values directly equal to percentages.
 */
function AgreementPie({ percentage }: { percentage: number }) {
  return (
    <svg viewBox="0 0 36 36" className="h-24 w-24 shrink-0" aria-hidden="true">
      {/* Disagree background ring */}
      <circle
        cx="18" cy="18" r="15.9"
        fill="none"
        className="stroke-red-100 dark:stroke-red-900"
        strokeWidth="3.8"
      />
      {/* Agree arc — starts at the top (offset 25 = 25% of circumference = 90°) */}
      <circle
        cx="18" cy="18" r="15.9"
        fill="none"
        className="stroke-green-500 dark:stroke-green-400"
        strokeWidth="3.8"
        strokeDasharray={`${percentage} ${100 - percentage}`}
        strokeDashoffset="25"
        strokeLinecap="round"
      />
      {/* Percentage label */}
      <text
        x="18" y="20"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        className="fill-gray-900 dark:fill-gray-100"
      >
        {percentage}%
      </text>
    </svg>
  );
}

export default function MemberDetail({ member, agreement }: MemberDetailProps) {
  const currentParty = member.partyHistory.at(-1)?.partyName ?? 'Unknown';
  const latestTerm = member.terms.at(-1);
  const role = latestTerm?.memberType ?? 'Member';

  const [showSharedVotes, setShowSharedVotes] = useState(false);
  const { votes, isLoading: votesLoading, isError: votesError } = useMemberSharedVotes(
    member.bioguideId,
    showSharedVotes
  );

  const directOrderName = (member as unknown as Record<string, string>)['directOrderName'];
  const firstName = directOrderName?.split(' ')[0] ?? member.name;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <img
          src={member.depiction?.imageUrl ?? '/placeholder-profile.jpg'}
          alt={`${member.name}'s profile picture`}
          width={80}
          height={80}
          className="h-20 w-20 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className={`text-xl font-semibold ${textPrimary}`}>
            {member.honorificName ? `${member.honorificName} ` : ''}{directOrderName}
          </h1>
          <p className={`mt-0.5 text-sm ${textMuted}`}>{member.state}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={partyBadge[currentParty] ?? badge.neutral}>{currentParty}</span>
            <span className={badge.neutral}>{role}</span>
            {member.currentMember && (
              <span className={badge.green}>Current Member</span>
            )}
          </div>
        </div>
      </div>

      {/* Agreement with user */}
      {agreement && agreement.percentage !== null && (
        <div className={`rounded-lg ${card} px-4 py-3`}>
          <div className="flex items-center gap-4">
            <AgreementPie percentage={agreement.percentage} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${textPrimary}`}>
                You agree with {firstName} {agreement.percentage}% of the time
              </p>
              <button
                onClick={() => setShowSharedVotes((v) => !v)}
                className={`mt-0.5 text-xs ${textLink} hover:underline`}
              >
                Based on {agreement.total} shared vote{agreement.total !== 1 ? 's' : ''}
                {' '}— {showSharedVotes ? 'hide' : 'show'}
              </button>
            </div>
          </div>

          {showSharedVotes && (
            <div className={`mt-4 border-t ${borderSubtle} pt-4`}>
              {votesLoading && <p className={feedback.loadingText}>Loading shared votes…</p>}
              {votesError  && <p className={feedback.errorText}>Failed to load shared votes.</p>}
              {!votesLoading && !votesError && votes.length === 0 && (
                <p className={feedback.loadingText}>No shared votes found.</p>
              )}
              {!votesLoading && !votesError && votes.length > 0 && (
                <ul className={`flex flex-col ${divideBase}`}>
                  {votes.map((v) => (
                    <li key={v.vote_id}>
                      <Link
                        to={`/votes/${encodeURIComponent(v.vote_id)}`}
                        className={`flex items-start justify-between gap-3 py-2.5 -mx-4 px-4 transition-colors ${hoverSurfaceSubtle} ${hoverTextPrimary}`}
                      >
                        <span className={`text-sm ${textPrimary} leading-snug`}>{v.question}</span>
                        <span className={`shrink-0 ${v.agreed ? badge.green : badge.red}`}>
                          {v.agreed ? 'Agreed' : 'Disagreed'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg ${card} px-4 py-3 text-center`}>
          <p className={`text-2xl font-semibold ${textPrimary}`}>{member.sponsoredLegislation.count}</p>
          <p className={`mt-0.5 text-xs ${textMuted}`}>Bills Sponsored</p>
        </div>
        <div className={`rounded-lg ${card} px-4 py-3 text-center`}>
          <p className={`text-2xl font-semibold ${textPrimary}`}>{member.cosponsoredLegislation.count}</p>
          <p className={`mt-0.5 text-xs ${textMuted}`}>Bills Cosponsored</p>
        </div>
      </div>

      {/* Website */}
      {member.officialWebsiteUrl && (
        <a
          href={member.officialWebsiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-sm ${textLink} underline hover:text-blue-800 dark:hover:text-blue-300`}
        >
          Official Website →
        </a>
      )}

      {/* Terms */}
      {member.terms.length > 0 && (
        <section>
          <h2 className={`mb-2 text-sm font-semibold ${textSecondary}`}>Terms Served</h2>
          <ol className={`relative border-l ${borderBase}`}>
            {[...member.terms].reverse().map((term, i) => (
              <li key={i} className="mb-3 ml-4">
                <div className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full border ${borderSubtle} bg-gray-300 dark:bg-gray-600`} />
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {term.chamber} · {term.congress}th Congress
                </p>
                <p className={`text-xs ${textFaint}`}>
                  {term.startYear}–{term.endYear ?? 'present'}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
