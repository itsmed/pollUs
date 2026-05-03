import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NavBar from './NavBar';
import { vi } from 'vitest';

vi.mock('@/lib/context/UserContext', () => ({
  useUser: () => ({ user: { name: 'Test User' }, isLoading: false }),
}));

vi.mock('@/lib/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: () => {} }),
}));

vi.mock('@votr/shared', () => ({
  useMyReps: () => ({ data: null }),
  navLink: { active: 'active', inactive: 'inactive' },
  btn: { ghost: 'ghost' },
  borderBase: '',
  surface: '',
  textPrimary: '',
  textMuted: '',
  getApiUrl: () => '',
}));

test('renders main nav links and user name', () => {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    </QueryClientProvider>
  );

  expect(screen.getByText('Polis')).toBeInTheDocument();
  expect(screen.getByText('Bills')).toBeInTheDocument();
  expect(screen.getByText('Members')).toBeInTheDocument();
  expect(screen.getByText('Votes')).toBeInTheDocument();
  expect(screen.getByText('Test User')).toBeInTheDocument();
});
