'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/context/UserContext';
import { findRepresentatives, type Legislator } from '@/lib/api/representatives';
import MemberCard from '@/components/members/MemberCard';

function toLegislatorMember(leg: Legislator, index: number) {
  return { id: index, ...leg };
}

function LegislatorSection({ title, legislators }: { title: string; legislators: Legislator[] }) {
  if (legislators.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      <ul className="flex flex-col gap-2">
        {legislators.map((leg, i) => (
          <li key={leg.api_id}>
            <MemberCard member={toLegislatorMember(leg, i)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [legislators, setLegislators] = useState<Legislator[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.address) return;
    setRepsLoading(true);
    setRepsError(null);
    findRepresentatives(user.address)
      .then((data) => setLegislators(data.legislators))
      .catch((err) => setRepsError(err instanceof Error ? err.message : 'Failed to load representatives'))
      .finally(() => setRepsLoading(false));
  }, [user?.address]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">
          Please{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            log in
          </Link>{' '}
          to view your profile.
        </p>
      </div>
    );
  }

  const senators = legislators.filter((l) => l.role === 'Senator');
  const representatives = legislators.filter((l) => l.role === 'Representative');

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10 flex flex-col gap-8">
        {/* Identity */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Name</p>
          <p className="text-lg font-medium text-gray-900">{user.name}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Address</p>
          {user.address ? (
            <p className="text-sm text-gray-700">{user.address}</p>
          ) : (
            <p className="text-sm text-gray-400">
              No address set.{' '}
              <Link href="/preferences" className="text-blue-600 hover:underline">
                Add one in preferences
              </Link>
              .
            </p>
          )}
        </section>

        {/* Congressional members */}
        {user.address && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Your Congressional Members</h2>
            {repsLoading && (
              <p className="text-sm text-gray-400">Looking up your representatives…</p>
            )}
            {repsError && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {repsError}
              </p>
            )}
            {!repsLoading && !repsError && legislators.length > 0 && (
              <div className="flex flex-col gap-6">
                <LegislatorSection title="Senators" legislators={senators} />
                <LegislatorSection title="Representative" legislators={representatives} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
