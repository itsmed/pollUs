import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillCard from './BillCard';
import { vi } from 'vitest';
import { type Bill } from '@votr/shared';

vi.mock('@votr/shared', () => ({
  badge: { neutral: 'neutral' },
  chamberBadgeByName: { House: 'house-badge', Senate: 'senate-badge' },
  cardElevated: 'card',
  textPrimary: 'tp',
  textSecondary: 'ts',
  textMuted: 'tm',
  textFaint: 'tf',
  borderSubtle: 'border',
}));

test('renders bill card with labels and latest action', () => {
  const bill = {
    id: 'B1',
    congress_number: 117,
    bill_type: 'HR',
    bill_number: '123',
    title: 'An Act to test things',
    origin_chamber: 'House',
    latest_action_text: 'Referred to committee',
    latest_action_date: '2023-01-15T00:00:00Z',
    update_date: '2023-02-01T00:00:00Z',
  } as unknown as Bill;

  render(
    <MemoryRouter>
      <BillCard bill={bill} />
    </MemoryRouter>
  );

  expect(screen.getByText('HR 123')).toBeInTheDocument();
  expect(screen.getByText('House')).toBeInTheDocument();
  expect(screen.getByText('An Act to test things')).toBeInTheDocument();
  expect(screen.getByText('Referred to committee')).toBeInTheDocument();
  expect(screen.getByText(/Updated/)).toBeInTheDocument();
});
