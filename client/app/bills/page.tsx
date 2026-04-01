import { useBills, pageShellFixed, pageHeaderColors, textPrimary, textMuted, feedback } from '@votr/shared';
import BillList from '@/components/bills/BillList';

/**
 * /bills — lists the most recent bills for the current congress.
 * Data is fetched from /api/bill (cache-first, falling back to Congress.gov API).
 */
export default function BillsPage() {
  const { bills, isLoading, isError } = useBills();

  return (
    <div className={pageShellFixed}>
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <h1 className={`text-xl font-semibold ${textPrimary}`}>Bills</h1>
        {!isLoading && !isError && (
          <p className={`mt-0.5 text-sm ${textMuted}`}>{bills.length} bills · 119th Congress</p>
        )}
      </header>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className={feedback.loadingText}>Loading bills…</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-1 items-center justify-center">
          <p className={feedback.errorText}>Failed to load bills. Please try again.</p>
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
