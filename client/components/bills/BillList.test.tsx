import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillList from './BillList';
import { vi } from 'vitest';
import { type Bill } from '@votr/shared';

vi.mock('@votr/shared', () => ({
  feedback: { loadingText: 'loading' },
}));

vi.mock('./BillCard', () => ({
  __esModule: true,
  default: ({ bill }: { bill: Bill }) => <div>{bill.title}</div>,
}));

test('renders empty message when no bills', () => {
  render(
    <MemoryRouter>
      <BillList bills={[]} emptyMessage="No bills" />
    </MemoryRouter>
  );

  expect(screen.getByText('No bills')).toBeInTheDocument();
});

test('renders list of bills', () => {
  const bills = [
    { id: 'b1', title: 'Bill One' },
    { id: 'b2', title: 'Bill Two' },
  ];

  render(
    <MemoryRouter>
      <BillList bills={bills as unknown as Bill[]} />
    </MemoryRouter>
  );

  expect(screen.getByText('Bill One')).toBeInTheDocument();
  expect(screen.getByText('Bill Two')).toBeInTheDocument();
});
