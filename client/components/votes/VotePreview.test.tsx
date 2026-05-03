import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VotePreview from './VotePreview';
import { vi } from 'vitest';
import { type VoteRow } from '@votr/shared';

vi.mock('@votr/shared', () => ({
  chamberBadgeByCode: { h: 'house-badge', s: 'senate-badge' },
  badge: { neutral: 'neutral' },
  cardElevated: 'card',
  textPrimary: 'tp',
  textMuted: 'tm',
  textFaint: 'tf',
}));

test('renders vote preview with chamber and date', () => {
  const vote = {
    vote_id: 'vote/1',
    type: 'On Passage',
    question: 'Shall the bill pass?',
    chamber: 'h',
    date: '2023-05-01T00:00:00Z',
    result: 'Passed',
  } as unknown as VoteRow;

  render(
    <MemoryRouter>
      <VotePreview vote={vote} />
    </MemoryRouter>
  );

  expect(screen.getByText('On Passage')).toBeInTheDocument();
  expect(screen.getByText('Shall the bill pass?')).toBeInTheDocument();
  expect(screen.getByText('House')).toBeInTheDocument();
  expect(screen.getByText('Passed')).toBeInTheDocument();
});
