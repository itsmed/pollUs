
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { user, isLoading, updateUser } = useUser();
  const [legislators, setLegislators] = useState<Legislator[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.address) return;
    setRepsLoading(true);
    setRepsError(null);
    findRepresentatives(user.address)
      .then((data) => setLegislators(data.legislators))
      .catch((err) => setRepsError(err instanceof Error ? err.message : 'Failed to load representatives'))
      .finally(() => setRepsLoading(false));
  }, [user?.address]);

  const handleAddressEdit = () => {
    setAddressInput(user?.address ?? '');
    setAddressError(null);
    setEditingAddress(true);
  };

  const handleAddressCancel = () => {
    setEditingAddress(false);
    setAddressError(null);
  };

  const handleAddressSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addressInput.trim();
    if (!trimmed) return;
    setAddressSaving(true);
    setAddressError(null);
    try {
      const data = await findRepresentatives(trimmed);
      const senator_api_ids = data.legislators
        .filter((l) => l.role === 'Senator')
        .map((l) => l.api_id);
      const congress_member_api_ids = data.legislators
        .filter((l) => l.role === 'Representative')
        .map((l) => l.api_id);
      await updateUser({ address: trimmed, senator_api_ids, congress_member_api_ids });
      setEditingAddress(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Failed to update address.');
    } finally {
      setAddressSaving(false);
    }
  };

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
          <Link to="/login" className="text-blue-600 hover:underline">
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

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Address</p>
            {!editingAddress && (
              <button
                onClick={handleAddressEdit}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {user.address ? 'Edit' : 'Add'}
              </button>
            )}
          </div>

          {editingAddress ? (
            <form onSubmit={handleAddressSave} className="mt-1 flex flex-col gap-2">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="123 Main St, Springfield, IL 62701"
                disabled={addressSaving}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              />
              {addressError && (
                <p className="text-xs text-red-600">{addressError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addressSaving || !addressInput.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addressSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleAddressCancel}
                  disabled={addressSaving}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : user.address ? (
            <p className="text-sm text-gray-700">{user.address}</p>
          ) : (
            <p className="text-sm text-gray-400">No address set.</p>
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
