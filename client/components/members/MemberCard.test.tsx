import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemberCard from './MemberCard';
import { vi } from 'vitest';
import { type Member } from '@votr/shared';

vi.mock('@votr/shared', () => ({
  partyBadge: { D: 'dem-badge', R: 'rep-badge' },
  badge: { neutral: 'neutral' },
  cardElevated: 'card',
  textPrimary: 'tp',
  textMuted: 'tm',
  textFaint: 'tf',
}));

test('renders member card with district and role', () => {
  const member = {
    api_id: 'M1',
    name: 'Doe, Jane',
    district: 5,
    role: 'Representative',
    party: 'D',
    photo_url: null,
  } as unknown as Member;

  render(
    <MemoryRouter>
      <MemberCard member={member} />
    </MemoryRouter>
  );

  expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  expect(screen.getByText('District 5')).toBeInTheDocument();
  expect(screen.getByText('D')).toBeInTheDocument();
  expect(screen.getByText('Representative')).toBeInTheDocument();
});
