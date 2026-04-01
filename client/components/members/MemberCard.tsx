import { Link } from 'react-router-dom';
import { type Member, partyBadge, badge, cardElevated, textPrimary, textMuted, textFaint } from '@votr/shared';

interface MemberCardProps {
  member: Member;
}

/**
 * Displays a single congressional member's key details.
 * Shows district only for Representatives; omits it for Senators.
 */
export default function MemberCard({ member }: MemberCardProps) {
  const { name, district, role, party } = member;

  return (
    <Link to={`/members/${member.api_id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
      <article className={`flex items-start justify-between ${cardElevated} px-4 py-3`}>
        <div className="min-w-0">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={member.photo_url ?? '/placeholder-profile.jpg'}
            alt={`${name}'s profile picture`}
            width={48}
            height={48}
          />
        </div>
        <div className="min-w-0">
          <p className={`truncate font-medium ${textPrimary}`}>{name.split(',').reverse().join(' ')}</p>
          {district != null && (
            <p className={`mt-0.5 text-sm ${textMuted}`}>District {district}</p>
          )}
        </div>
        <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
          <span className={partyBadge[party] ?? badge.neutral}>{party}</span>
          <span className={`text-xs ${textFaint}`}>{role}</span>
        </div>
      </article>
    </Link>
  );
}
