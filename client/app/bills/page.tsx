'use client';

import { useBills } from '@/lib/hooks/useBills';
import BillList from '@/components/bills/BillList';

/**
 * /bills — lists the most recent bills for the current congress.
 * Data is fetched from /api/bill (cache-first, falling back to Congress.gov API).
 */
export default function BillsPage() {
  const { bills, isLoading, isError } = useBills();

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Bills</h1>
        {!isLoading && !isError && (
          <p className="mt-0.5 text-sm text-gray-500">{bills.length} bills · 119th Congress</p>
        )}
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-400">Loading bills…</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-red-500">Failed to load bills. Please try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <BillList bills={bills} />
        </div>
      )}
    </div>
  );
}
