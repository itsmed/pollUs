'use client';

import { useState } from 'react';
import { useVotes } from '@/lib/hooks/useVotes';
import VoteList from '@/components/votes/VoteList';

type ChamberFilter = 'all' | 'h' | 's';

const TABS: { value: ChamberFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 's',   label: 'Senate' },
  { value: 'h',   label: 'House' },
];

export default function VotesPage() {
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('all');
  const chamber = chamberFilter === 'all' ? undefined : chamberFilter;

  const { data, isLoading, isError } = useVotes({ limit: 50, chamber });

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Congressional Votes</h1>
        {data && (
          <p className="mt-0.5 text-sm text-gray-500">
            {data.total.toLocaleString()} votes
          </p>
        )}
      </header>

      {/* Chamber tabs */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="flex px-4">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setChamberFilter(value)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                chamberFilter === value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Loading votes…</p>
        )}
        {isError && (
          <p className="px-4 py-8 text-center text-sm text-red-500">
            Failed to load votes. Please try again.
          </p>
        )}
        {!isLoading && !isError && data && (
          <VoteList votes={data.votes} />
        )}
      </main>
    </div>
  );
}
