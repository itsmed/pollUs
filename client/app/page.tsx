import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { findRepresentatives, type FindRepsResponse, type RepLegislator, getApiUrl } from '@pollus/shared';
import MemberCard from '@/components/members/MemberCard';
import { useUser } from '@/lib/context/UserContext';
import {
  pageShell,
  btn,
  inputBase,
  textPrimary,
  textMuted,
  textFaint,
  textLink,
  feedback,
  borderBase,
} from '@pollus/shared';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.3-162-39.3c-74 0-101.4 40.7-163.4 40.7s-105.4-57.4-155.5-127.4C46 790.4-.5 663.1-.5 541.8c0-207.4 135.4-316.8 268.9-316.8 36.6 0 106.5 16.5 156.5 70.4 44.9 48.5 70.4 65.7 124.3 65.7z" />
      <path d="M414.6 83.1c-6.4-35.9-23.1-82.8-57.7-119.4-64.4-68.4-149.5-73.3-165.4-73.3-1.3 0-2.6.1-3.8.1C154.9-108 75.9-60.2 24.2 8.4c-41.2 53.8-65.7 128.7-65.7 199.7 0 1.9.1 3.8.2 5.6 4.5 143.9 105.2 275.1 227.3 275.1 62.7 0 119.6-42.1 162.6-42.1 41.3 0 105.6 44.9 176.9 44.9 64.4 0 138.1-42.9 179.1-116.4-10.5-3.9-191.8-78.2-191.8-292.1z" />
    </svg>
  );
}

function toLegislatorMember(leg: RepLegislator, index: number) {
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
            <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${textFaint}`}>
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
            <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${textFaint}`}>
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

      <div className={`rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 px-6 py-5`}>
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Want to vote on bills and see how your views compare to your representatives'?
        </p>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
          Sign up to track your voting history and hold your reps accountable.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={`${API_URL}/api/auth/google`}
            className={`flex items-center justify-center gap-2 ${btn.secondary} px-4 py-2.5 text-sm`}
          >
            <GoogleIcon />
            Continue with Google
          </a>
          <a
            href={`${API_URL}/api/auth/apple`}
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-100"
          >
            <AppleIcon />
            Continue with Apple
          </a>
        </div>
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

  if (user) return <Navigate to="/profile" replace />;

  return (
    <div className={pageShell}>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
        <div className="flex flex-col gap-3">
          <h1 className={`text-3xl font-semibold tracking-tight ${textPrimary}`}>
            Know Your Congress
          </h1>
          <p className={`text-base leading-7 ${textMuted}`}>
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
            className={`flex-1 ${inputBase} px-4 py-2.5 text-sm disabled:opacity-50`}
          />
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className={`shrink-0 ${btn.primary} px-5 py-2.5 text-sm`}
          >
            {isLoading ? 'Searching…' : 'Find My Representatives'}
          </button>
        </form>

        {error && <p className={feedback.error}>{error}</p>}

        {result && <RepsResults result={result} />}
      </main>
    </div>
  );
}
