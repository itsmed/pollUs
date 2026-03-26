import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/context/UserContext';
import { useMyReps } from '@/lib/hooks/useMyReps';
import { useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const NAV_LINKS = [
  { href: '/bills', label: 'Bills' },
  { href: '/members', label: 'Members' },
  { href: '/votes', label: 'Votes' },
];

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useUser();

  const hasReps =
    !isLoading &&
    !!user &&
    ((user.senator_ids?.length ?? 0) > 0 || (user.congress_member_ids?.length ?? 0) > 0);

  const { data: reps } = useMyReps(hasReps);

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    queryClient.setQueryData(['currentUser'], null);
    queryClient.removeQueries({ queryKey: ['myReps'] });
    navigate('/');
  }

  const allReps = reps ? [...reps.senators, ...reps.representatives] : [];

  return (
    <nav className="shrink-0 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="py-4 text-sm font-semibold text-gray-900 hover:text-blue-600">
          Polis
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                to={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {!isLoading && allReps.length > 0 &&
            allReps.map((rep) => {
              const href = `/members/${rep.api_id}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={rep.api_id}
                  to={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {rep.role + ' ' + (rep.name.includes(',') ? rep.name.split(', ').reverse().join(' ') : rep.name)}
                </Link>
              );
            })
          }
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isLoading && user && (
            <>
              <Link
                to="/preferences"
                title="Preferences"
                className={`rounded-md p-2 transition-colors ${
                  pathname === '/preferences'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <GearIcon />
              </Link>
              <Link
                to="/profile"
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === '/profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {user.name}
              </Link>
            </>
          )}
          {!isLoading && (
            <button
              onClick={user ? handleLogout : () => navigate('/login')}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {user ? 'Log out' : 'Log in'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
