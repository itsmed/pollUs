'use client';

import { useState } from 'react';
import { findRepresentatives, type FindRepsResponse, type Legislator } from '@/lib/api/representatives';
import MemberCard from '@/components/members/MemberCard';

/**
 * Converts a Legislator (from the Geocodio response) into the shape
 * MemberCard expects. The `id` field is not used in MemberCard's render,
 * so we supply the index as a synthetic value.
 */
function toLegislatorMember(leg: Legislator, index: number) {
  return { id: index, ...leg };
}

interface LegislatorSectionProps {
  title: string;
  legislators: Legislator[];
}

function LegislatorSection({ title, legislators }: LegislatorSectionProps) {
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

interface ResultsPanelProps {
  result: FindRepsResponse;
}

function ResultsPanel({ result }: ResultsPanelProps) {
  const senators = result.legislators.filter((l) => l.role === 'Senator');
  const representatives = result.legislators.filter((l) => l.role === 'Representative');

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="text-sm text-gray-500">
        Showing results for <span className="font-medium text-gray-800">{result.address}</span>
      </p>
      <LegislatorSection title="Senators" legislators={senators} />
      <LegislatorSection title="Representative" legislators={representatives} />
    </div>
  );
}

/**
 * /find-my-reps — address lookup for congressional representatives and senators.
 * Calls the backend /find-representative-and-senator endpoint which geocodes the
 * address via Geocodio and returns the current legislators for that district.
 */
export default function FindMyRepsPage() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<FindRepsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await findRepresentatives(address.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Find My Representatives</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Enter your US address to find your senators and congressional representative.
        </p>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="address" className="text-sm font-medium text-gray-700">
              Street address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Springfield, IL 62701"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !address.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Searching…' : 'Find Representatives'}
            </button>
          </form>

          {error && (
            <p className="mt-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          {result && <ResultsPanel result={result} />}
        </div>
      </main>
    </div>
  );
}
