import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useBillDetail, useBillText, pageShell, pageHeaderColors, textLink, feedback } from '@votr/shared';
import BillDetail from '@/components/bills/BillDetail';

/**
 * /bills/:congress/:type/:number — detailed view for a single bill.
 * Loads actions and summaries from the backend; text is fetched on demand.
 */
export default function BillDetailPage() {
  const { congress, type, number } = useParams<{ congress: string; type: string; number: string }>();
  const congressNum = Number(congress);

  const { detail, isLoading, isError } = useBillDetail(congressNum, type!, number!);
  const { textVersions, isLoading: isTextLoading, isError: isTextError, fetch: fetchText } =
    useBillText(congressNum, type!, number!);

  return (
    <div className={pageShell}>
      <header className={`shrink-0 ${pageHeaderColors} px-6 py-4`}>
        <Link to="/bills" className={`text-sm ${textLink} hover:underline`}>
          ← Bills
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {isLoading && <p className={feedback.loadingText}>Loading bill…</p>}
        {isError   && <p className={feedback.errorText}>Failed to load bill. Please try again.</p>}

        {!isLoading && !isError && (
          <BillDetail
            bill={detail?.bill ?? null}
            actions={detail?.actions ?? []}
            summaries={detail?.summaries ?? []}
            textVersions={textVersions}
            isTextLoading={isTextLoading}
            isTextError={isTextError}
            onFetchText={fetchText}
            fallbackLabel={`${type!.toUpperCase()} ${number} · ${congress}th Congress`}
          />
        )}
      </main>
    </div>
  );
}
