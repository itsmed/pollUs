import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { findRepresentatives, type FindRepsResponse, type Legislator } from '@/lib/api/representatives';
import MemberCard from '@/components/members/MemberCard';
import { useUser } from '@/lib/context/UserContext';

function toLegislatorMember(leg: Legislator, index: number) {
  return { id: index, ...leg };
}

function RepsResults({ result }: { result: FindRepsResponse }) {
  const senators = result.legislators.filter((l) => l.role === 'Senator');
  const representatives = result.legislators.filter((l) => l.role === 'Representative');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {senators.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Senators
            </h2>
            <ul className="flex flex-col gap-2">
              {senators.map((leg, i) => (
                <li key={leg.api_id}>
                  <MemberCard member={toLegislatorMember(leg, i)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {representatives.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Representative
            </h2>
            <ul className="flex flex-col gap-2">
              {representatives.map((leg, i) => (
                <li key={leg.api_id}>
                  <MemberCard member={toLegislatorMember(leg, i)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-6 py-5">
        <p className="text-sm font-medium text-blue-900">
          Want to vote on bills and see how your views compare to your representatives'?
        </p>
        <Link
          to="/login"
          className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Sign up to get started
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<FindRepsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await findRepresentatives(address.trim());
      setResult(data);
      queryClient.setQueryData(['browsingReps'], data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logged-in users don't need the homepage flow
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Welcome back, {user.name}</h1>
          <div className="flex gap-3">
            <Link
              to="/bills"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Bills
            </Link>
            <Link
              to="/profile"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Know Your Congress
          </h1>
          <p className="text-base leading-7 text-zinc-500">
            Enter your address to find your senators and representative. Sign up to vote on bills
            and compare your opinions with theirs.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Springfield, IL 62701"
            disabled={isLoading}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Searching…' : 'Find My Representatives'}
          </button>
        </form>

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {result && <RepsResults result={result} />}
      </main>
    </div>
  );
}
