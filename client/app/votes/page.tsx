import { useState } from 'react';
import { useVotes, pageShellFixed, pageHeaderColors, borderBase, surface, textPrimary, textMuted, textLink, feedback } from '@votr/shared';
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
    <div className={pageShellFixed}>
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <h1 className={`text-xl font-semibold ${textPrimary}`}>Congressional Votes</h1>
        {data && (
          <p className={`mt-0.5 text-sm ${textMuted}`}>
            {data.total.toLocaleString()} votes
          </p>
        )}
      </header>

      {/* Chamber tabs */}
      <div className={`shrink-0 border-b ${borderBase} ${surface}`}>
        <div className="flex px-4">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setChamberFilter(value)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                chamberFilter === value
                  ? `border-b-2 border-blue-600 ${textLink}`
                  : `${textMuted} hover:text-gray-700 dark:hover:text-gray-300`
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <p className={`px-4 py-8 text-center ${feedback.loadingText}`}>Loading votes…</p>
        )}
        {isError && (
          <p className={`px-4 py-8 text-center ${feedback.errorText}`}>
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
