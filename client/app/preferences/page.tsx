'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/context/UserContext';

export default function PreferencesPage() {
  const { user, isLoading, updateUser } = useUser();
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.address) setAddress(user.address);
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
          to view preferences.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateUser({ address: address.trim() || null });
      setSaved(true);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Preferences</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Your Address</h2>
          <p className="mt-1 text-sm text-gray-500">
            Used to look up your congressional representatives.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setSaved(false); }}
              placeholder="123 Main St, Springfield, IL 62701"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              disabled={saving}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <p className="text-sm text-green-600">Saved!</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
