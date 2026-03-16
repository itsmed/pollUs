import Link from 'next/link';
import { type VoteRow } from '@/lib/api/congressionalVotes';

const CHAMBER_LABEL: Record<string, string> = {
  h: 'House',
  s: 'Senate',
};

const CHAMBER_STYLES: Record<string, string> = {
  h: 'bg-amber-100 text-amber-800',
  s: 'bg-indigo-100 text-indigo-800',
};

interface VotePreviewProps {
  vote: VoteRow;
}

export default function VotePreview({ vote }: VotePreviewProps) {
  return (
    <Link
      href={`/votes/${encodeURIComponent(vote.vote_id)}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
    >
      <article className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{vote.type}</p>
            <p className="mt-1 text-sm text-gray-900 line-clamp-2">{vote.question}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CHAMBER_STYLES[vote.chamber] ?? 'bg-gray-100 text-gray-700'}`}>
            {CHAMBER_LABEL[vote.chamber] ?? vote.chamber.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>{new Date(vote.date).toLocaleDateString()}</span>
          {vote.result && <span className="truncate">{vote.result}</span>}
        </div>
      </article>
    </Link>
  );
}
