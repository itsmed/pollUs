import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NavBar from './NavBar';
import { vi } from 'vitest';

// Mutable test state so different tests can control mocked hooks
let userContext: any = { user: { name: 'Test User' }, isLoading: false };
let myReps: any = { data: null };
const setThemeMock = vi.fn();
const navigateMock = vi.fn();

let theme: 'light' | 'dark' | 'system' = 'light';
vi.mock('@/lib/context/ThemeContext', () => ({
  useTheme: () => ({ theme, setTheme: setThemeMock }),
}));


vi.mock('@/lib/context/UserContext', () => ({
  useUser: () => userContext,
}));

vi.mock('@votr/shared', () => ({
  useMyReps: () => myReps,
  navLink: { active: 'active', inactive: 'inactive' },
  btn: { ghost: 'ghost' },
  borderBase: '',
  surface: '',
  textPrimary: '',
  textMuted: '',
  textFaint: '',
  getApiUrl: () => 'http://api',
}));

// Mock react-router's useNavigate to capture navigation calls
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  // reset defaults
  userContext = { user: { name: 'Test User' }, isLoading: false };
  myReps = { data: null };
  theme = 'light';
});

test('theme dark cycles to system', async () => {
  theme = 'dark';
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  const btn = screen.getByTitle('Theme: Dark (click for System)');
  await userEvent.click(btn);
  expect(setThemeMock).toHaveBeenCalledWith('system');
});

test('theme system cycles to light', async () => {
  theme = 'system';
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  const btn = screen.getByTitle('Theme: System (click for Light)');
  await userEvent.click(btn);
  expect(setThemeMock).toHaveBeenCalledWith('light');
});

test('theme toggle cycles theme by calling setTheme', async () => {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  // The accessible name for the button is the visible span 'Light', but the title contains the full cue
  const btn = screen.getByTitle('Theme: Light (click for Dark)');
  await userEvent.click(btn);
  expect(setThemeMock).toHaveBeenCalledWith('dark');
});

test('renders dynamic rep links when user has reps', () => {
  // Set user to have reps
  userContext = { user: { name: 'Rep User', senator_ids: ['S1'], congress_member_ids: [] }, isLoading: false };
  myReps = { data: { senators: [{ api_id: 'S1', role: 'Senator', name: 'Smith, John' }], representatives: [] } };

  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  expect(screen.getByText('Senator John Smith')).toBeInTheDocument();
});

test('logout calls API, clears queries and navigates home', async () => {
  // Mock user present
  userContext = { user: { name: 'Logout User' }, isLoading: false };
  myReps = { data: null };

  // Spy on fetch
  const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
  // @ts-ignore
  global.fetch = fetchMock;

  const qc = new QueryClient();
  const setQuerySpy = vi.spyOn(qc, 'setQueryData');
  const removeQueriesSpy = vi.spyOn(qc, 'removeQueries');

  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  const btn = screen.getByText('Log out');
  await userEvent.click(btn);

  // Wait for async handleLogout to call fetch
  expect(fetchMock).toHaveBeenCalled();
  expect(setQuerySpy).toHaveBeenCalled();
  expect(removeQueriesSpy).toHaveBeenCalled();
  expect(navigateMock).toHaveBeenCalledWith('/');
});

test('renders representative links when user has representatives', () => {
  // Set user to have representatives
  userContext = { user: { name: 'Rep User', senator_ids: [], congress_member_ids: ['R1'] }, isLoading: false };
  myReps = { data: { senators: [], representatives: [{ api_id: 'R1', role: 'Representative', name: 'Doe, Jane' }] } };

  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  expect(screen.getByText('Representative Jane Doe')).toBeInTheDocument();
});
