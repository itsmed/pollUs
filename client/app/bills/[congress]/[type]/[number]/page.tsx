'use client';

import { use } from 'react';
import Link from 'next/link';
import { useBillDetail, useBillText } from '@/lib/hooks/useBills';
import BillDetail from '@/components/bills/BillDetail';

interface PageParams {
  congress: string;
  type: string;
  number: string;
}

/**
 * /bills/[congress]/[type]/[number] — detailed view for a single bill.
 * Loads actions and summaries from the backend; text is fetched on demand.
 */
export default function BillDetailPage({ params }: { params: Promise<PageParams> }) {
  const { congress, type, number } = use(params);
  const congressNum = Number(congress);

  const { detail, isLoading, isError } = useBillDetail(congressNum, type, number);
  const { textVersions, isLoading: isTextLoading, isError: isTextError, fetch: fetchText } =
    useBillText(congressNum, type, number);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <Link href="/bills" className="text-sm text-blue-600 hover:underline">
          ← Bills
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {isLoading && (
          <p className="text-sm text-gray-400">Loading bill…</p>
        )}

        {isError && (
          <p className="text-sm text-red-500">Failed to load bill. Please try again.</p>
        )}

        {!isLoading && !isError && (
          <BillDetail
            bill={detail?.bill ?? null}
            actions={detail?.actions ?? []}
            summaries={detail?.summaries ?? []}
            textVersions={textVersions}
            isTextLoading={isTextLoading}
            isTextError={isTextError}
            onFetchText={fetchText}
            fallbackLabel={`${type.toUpperCase()} ${number} · ${congress}th Congress`}
          />
        )}
      </main>
    </div>
  );
}
