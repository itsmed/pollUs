import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/context/UserContext';
import { useTheme, type Theme } from '@/lib/context/ThemeContext';
import { useMyReps, navLink, btn, borderBase, surface, textPrimary, textMuted, getApiUrl } from '@votr/shared';
import { useQueryClient } from '@tanstack/react-query';

const NAV_LINKS = [
  { href: '/bills',   label: 'Bills' },
  { href: '/members', label: 'Members' },
  { href: '/votes',   label: 'Votes' },
];

// ── Theme toggle ──────────────────────────────────────────────────────────────

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];
const THEME_LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Theme: ${THEME_LABELS[theme]} (click for ${THEME_LABELS[next]})`}
      className={`flex items-center gap-1.5 px-2 py-2 text-xs ${btn.ghost}`}
    >
      {theme === 'light'  && <SunIcon />}
      {theme === 'dark'   && <MoonIcon />}
      {theme === 'system' && <MonitorIcon />}
      <span className="hidden sm:inline">{THEME_LABELS[theme]}</span>
    </button>
  );
}

// ── Gear icon ─────────────────────────────────────────────────────────────────

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

// ── Nav bar ───────────────────────────────────────────────────────────────────

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
    await fetch(`${getApiUrl()}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    queryClient.setQueryData(['currentUser'], null);
    queryClient.removeQueries({ queryKey: ['myReps'] });
    navigate('/');
  }

  const allReps = reps ? [...reps.senators, ...reps.representatives] : [];

  return (
    <nav className={`shrink-0 border-b ${borderBase} ${surface}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className={`py-4 text-sm font-semibold ${textPrimary} hover:text-blue-600 dark:hover:text-blue-400`}>
          Votr 
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} to={href} className={isActive ? navLink.active : navLink.inactive}>
                {label}
              </Link>
            );
          })}

          {!isLoading && allReps.length > 0 &&
            allReps.map((rep) => {
              const href = `/members/${rep.api_id}`;
              const isActive = pathname === href;
              return (
                <Link key={rep.api_id} to={href} className={isActive ? navLink.active : navLink.inactive}>
                  {rep.role + ' ' + (rep.name.includes(',') ? rep.name.split(', ').reverse().join(' ') : rep.name)}
                </Link>
              );
            })
          }
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {!isLoading && user && (
            <>
              <Link
                to="/preferences"
                title="Preferences"
                className={`rounded-md p-2 transition-colors ${
                  pathname === '/preferences'
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : `${textMuted} hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100`
                }`}
              >
                <GearIcon />
              </Link>
              <Link
                to="/profile"
                className={pathname === '/profile' ? navLink.active : navLink.inactive}
              >
                {user.name}
              </Link>
            </>
          )}
          {!isLoading && (
            <button
              onClick={user ? handleLogout : () => navigate('/login')}
              className={`px-3 py-2 text-sm ${btn.ghost}`}
            >
              {user ? 'Log out' : 'Log in'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
