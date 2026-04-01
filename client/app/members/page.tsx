import { useState } from 'react';
import { useMembers, pageShellFixed, pageHeaderColors, borderBase, surface, textPrimary, textMuted, textLink, feedback } from '@votr/shared';
import MemberList from '@/components/members/MemberList';

type Chamber = 'senate' | 'house';

/**
 * /members — lists all congressional members.
 * Desktop: two-column layout with senators on the left and representatives on the right.
 * Mobile: single-column with a tab selector to switch between chambers.
 */
export default function MembersPage() {
  const [activeChamber, setActiveChamber] = useState<Chamber>('senate');
  const { senators, representatives, isLoading, isError } = useMembers();

  return (
    <div className={pageShellFixed}>
      {/* Header */}
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <h1 className={`text-xl font-semibold ${textPrimary}`}>Members of Congress</h1>
        {!isLoading && !isError && (
          <p className={`mt-0.5 text-sm ${textMuted}`}>
            {senators.length} senators · {representatives.length} representatives
          </p>
        )}
      </header>

      {/* Mobile chamber tabs */}
      <div className={`shrink-0 border-b ${borderBase} ${surface} md:hidden`}>
        <div className="flex">
          {(['senate', 'house'] as Chamber[]).map((chamber) => (
            <button
              key={chamber}
              onClick={() => setActiveChamber(chamber)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeChamber === chamber
                  ? `border-b-2 border-blue-600 ${textLink}`
                  : `${textMuted} hover:text-gray-700 dark:hover:text-gray-300`
              }`}
            >
              {chamber === 'senate' ? 'Senate' : 'House of Representatives'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className={feedback.loadingText}>Loading members…</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-1 items-center justify-center">
          <p className={feedback.errorText}>Failed to load members. Please try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className={`min-h-0 flex-1 md:grid md:grid-cols-2 md:divide-x md:divide-gray-200 dark:md:divide-gray-700`}>
          {/* Senators — hidden on mobile when House tab is active */}
          <section
            className={`flex flex-col overflow-hidden ${
              activeChamber === 'house' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className={`hidden shrink-0 border-b ${borderBase} ${surface} px-4 py-3 md:block`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>
                Senate
              </h2>
            </div>
            <div className="overflow-y-auto">
              <MemberList members={senators} emptyMessage="No senators found." />
            </div>
          </section>

          {/* Representatives — hidden on mobile when Senate tab is active */}
          <section
            className={`flex flex-col overflow-hidden ${
              activeChamber === 'senate' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className={`hidden shrink-0 border-b ${borderBase} ${surface} px-4 py-3 md:block`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${textMuted}`}>
                House of Representatives
              </h2>
            </div>
            <div className="overflow-y-auto">
              <MemberList members={representatives} emptyMessage="No representatives found." />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
