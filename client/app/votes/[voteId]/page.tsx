'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVoteDetail } from '@/lib/hooks/useVotes';
import VoteDetail from '@/components/votes/VoteDetail';

interface PageParams {
  voteId: string;
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function VoteDetailPage({ params }: { params: Promise<PageParams> }) {
  const { voteId } = use(params);
  const router = useRouter();
  const decodedId = decodeURIComponent(voteId);

  const { data, isLoading, isError } = useVoteDetail(decodedId);

  const prevId = data?.prev_vote_id;
  const nextId = data?.next_vote_id;

  function navigateTo(id: string) {
    router.push(`/votes/${encodeURIComponent(id)}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/votes" className="text-sm text-blue-600 hover:underline">
            ← Votes
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => prevId && navigateTo(prevId)}
              disabled={!prevId}
              aria-label="Previous vote"
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => nextId && navigateTo(nextId)}
              disabled={!nextId}
              aria-label="Next vote"
              className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {isLoading && <p className="text-sm text-gray-400">Loading vote…</p>}
        {isError && (
          <p className="text-sm text-red-500">Failed to load vote. Please try again.</p>
        )}
        {!isLoading && !isError && data && (
          <VoteDetail vote={data.vote} positions={data.positions} />
        )}
      </main>
    </div>
  );
}
