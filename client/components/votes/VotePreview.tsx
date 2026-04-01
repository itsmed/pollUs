import { Link } from 'react-router-dom';
import { type VoteRow, chamberBadgeByCode, badge, cardElevated, textPrimary, textMuted, textFaint } from '@votr/shared';

const CHAMBER_LABEL: Record<string, string> = {
  h: 'House',
  s: 'Senate',
};

interface VotePreviewProps {
  vote: VoteRow;
}

export default function VotePreview({ vote }: VotePreviewProps) {
  return (
    <Link
      to={`/votes/${encodeURIComponent(vote.vote_id)}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
    >
      <article className={`${cardElevated} px-4 py-3`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${textMuted} truncate`}>{vote.type}</p>
            <p className={`mt-1 text-sm ${textPrimary} line-clamp-2`}>{vote.question}</p>
          </div>
          <span className={`shrink-0 ${chamberBadgeByCode[vote.chamber] ?? badge.neutral}`}>
            {CHAMBER_LABEL[vote.chamber] ?? vote.chamber.toUpperCase()}
          </span>
        </div>
        <div className={`mt-2 flex items-center gap-3 text-xs ${textFaint}`}>
          <span>{new Date(vote.date).toLocaleDateString()}</span>
          {vote.result && <span className="truncate">{vote.result}</span>}
        </div>
      </article>
    </Link>
  );
}
