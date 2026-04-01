import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/lib/context/UserContext';
import {
  pageShell,
  pageHeaderColors,
  card,
  btn,
  inputBase,
  textPrimary,
  textMuted,
  textLink,
  feedback,
} from '@votr/shared';

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
      <div className={`flex min-h-screen items-center justify-center ${pageShell}`}>
        <p className={feedback.loadingText}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${pageShell}`}>
        <p className={`text-sm ${textMuted}`}>
          Please{' '}
          <Link to="/login" className={`${textLink} hover:underline`}>log in</Link>
          {' '}to view preferences.
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
    <div className={pageShell}>
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <h1 className={`text-xl font-semibold ${textPrimary}`}>Preferences</h1>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <section className={`rounded-xl ${card} p-6`}>
          <h2 className={`text-sm font-semibold ${textPrimary}`}>Your Address</h2>
          <p className={`mt-1 text-sm ${textMuted}`}>
            Used to look up your congressional representatives.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => { setAddress(e.target.value); setSaved(false); }}
              placeholder="123 Main St, Springfield, IL 62701"
              className={`${inputBase} px-4 py-2.5 text-sm`}
              disabled={saving}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className={`${btn.primary} px-4 py-2.5 text-sm`}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved  && <p className={feedback.successText}>Saved!</p>}
              {error  && <p className={feedback.errorText}>{error}</p>}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
